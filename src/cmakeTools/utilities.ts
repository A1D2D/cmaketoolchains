import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ExecOptions } from 'child_process';

import { toolchains, profiles, activeBuildDir, setToolchains, setProfiles, setActiveBuildDir, BuildTargets, setAvaliableTargets } from '../globals';

export function runCMakeSyncCommand(projectPath: string) {
	const config = vscode.workspace.getConfiguration('cmaketoolchains');
	setProfiles(config.get('cmakeProfiles') || []);

	const cmakeSelectedProfile = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedProfile');
	const profile = profiles.find(p => p.name === cmakeSelectedProfile);
	if (!profile) {
		throw new Error("Selected profile not found.");
	}

	setToolchains(config.get('cmakeToolchains') || []);
	const toolchain = toolchains.find(tc => tc.name === profile.toolchain);

	if (!toolchain) {
		throw new Error("Toolchain not found set by the current selected cmake profile.");
	}

	const output = vscode.window.createOutputChannel('CMake Build Config');
	output.clear();
	output.show(true);
	output.appendLine(`[CMake] Configuring in ${projectPath}...`);


	const cmakeExecutable = toolchain.cmake || 'cmake';
	const buildType = profile.buildType ? `-DCMAKE_BUILD_TYPE=${profile.buildType}` : '';
	const buildTool = toolchain.buildTool ? `-DCMAKE_MAKE_PROGRAM=${toolchain.buildTool}` : '';
	const cCompiler = toolchain.ccompiler ? `-DCMAKE_C_COMPILER=${toolchain.ccompiler}` : '';
	const cppCompiler = toolchain.cppcompiler ? `-DCMAKE_CXX_COMPILER=${toolchain.cppcompiler}` : '';
	const buildDir = profile.buildDirectory || profile.buildType ? `build-${profile.buildType.toLowerCase()}` : 'build';

	setActiveBuildDir(path.join(buildDir));

	const buildToolType = toolchain.buildTool ? detectGeneratorFromBuildTool(toolchain.buildTool) : '';
	const optionalBuildTypeFlag = buildToolType ? `-G ${buildToolType}` : '';
	const generator = profile.generator ? `-G ${profile.generator}` : optionalBuildTypeFlag;

	const cmakeCmd = `${cmakeExecutable} ${buildType} ${buildTool} ${cCompiler} ${cppCompiler} ${generator} -S . -B ${buildDir} -DCMAKE_EXPORT_COMPILE_COMMANDS=ON`.trim();

	const options: ExecOptions = {
		cwd: projectPath
	};

	const buildPath = path.join(projectPath, buildDir);

	output.appendLine(`creating V1 Query files in build directory: ${buildPath}`);
	output.appendLine(`executed cmake command: ${cmakeCmd}`);

	createCodeModelV1Query(buildPath);
	const child = cp.exec(cmakeCmd, options);

	if (!child) {
		output.appendLine('[Error] Failed to start CMake process.');
		return;
	}

	parseCMakeFileApiReply(buildPath);

	child.stdout?.on('data', (data: Buffer) => {
		output.append(data.toString());
	});

	child.stderr?.on('data', (data: Buffer) => {
		output.append(data.toString());
	});

	child.on('close', (code: number | null) => {
		if (code !== 0) {
			output.appendLine(`[Error] CMake exited with code ${code}`);
		} else {
			output.appendLine('[Info] CMake finished successfully.');
		}
	});
}

export async function getCleanCMakeTargets(buildDir: string): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const command = `cmake --build "${buildDir}" --target help`;

		cp.exec(command, (error, stdout, stderr) => {
			if (error) {
				reject(new Error(`Failed to get CMake targets: ${error.message}`));
				return;
			}

			// Common CMake system/utility targets to filter out
			const systemTargets = new Set([
				'clean', 'help', 'install', 'package', 'package_source',
				'edit_cache', 'rebuild_cache', 'test', 'preinstall', 'install/local',
				'install/strip', 'list_install_components', 'depend',
				'build.ninja', 'cmake_force', 'cmake_check_build_system'
			]);

			const targets = stdout
				.split('\n')
				.map(line => line.trim())
				// Look for lines that contain target descriptions (usually have "...")
				.filter(line => line.includes('...') || line.includes(':'))
				.map(line => {
					// Extract target name (everything before "..." or ":")
					if (line.includes('...')) {
						return line.split('...')[0].trim();
					} else if (line.includes(':')) {
						return line.split(':')[0].trim();
					}
					return line.trim();
				})
				.filter(target => {
					if (!target || target.length === 0) { return false; }

					// Filter out system targets
					if (systemTargets.has(target)) { return false; }

					// Filter out internal/generated targets (usually start with underscore or contain slashes)
					if (target.startsWith('_')) { return false; }
					if (target.includes('/') && !target.match(/^[a-zA-Z]/)) { return false; }

					// Filter out file extensions (like .ninja files)
					if (target.includes('.')) {
						const ext = target.split('.').pop()?.toLowerCase();
						if (['ninja', 'cmake', 'make', 'vcxproj'].includes(ext || '')) { return false; }
					}

					// Keep targets that look like actual build targets
					return target.match(/^[a-zA-Z][a-zA-Z0-9_-]*$/);
				})
				.sort();

			// Remove duplicates
			const uniqueTargets = [...new Set(targets)];

			resolve(uniqueTargets);
		});
	});
}

export async function runCMakeTargetBuild(projectPath: string, buildDirPath: string, targetName: string) {
	return new Promise((resolve) => {
		const output = vscode.window.createOutputChannel('CMake Build');
		output.clear();
		output.show(true);

		const cmakeCmd = `cmake --build "${buildDirPath}" --target "${targetName}"`;

		const options: ExecOptions = {
			cwd: projectPath
		};

		output.appendLine(`[CMake] build command: ${cmakeCmd}`);
		const child = cp.exec(cmakeCmd, options);

		if (!child) {
			output.appendLine('[Error] Failed to start CMake process.');
			return;
		}

		child.stdout?.on('data', (data: Buffer) => {
			output.append(data.toString());
		});

		child.stderr?.on('data', (data: Buffer) => {
			output.append(data.toString());
		});

		child.on('close', (code: number | null) => {
			if (code !== 0) {
				output.appendLine(`[Error] CMake exited with code ${code}`);
			} else {
				output.appendLine('[Info] CMake finished successfully.');
			}
		});
	});
}

export async function updateC_CppExtensionCompileCommands(buildDir: string) {
	const config = vscode.workspace.getConfiguration('C_Cpp');
	await config.update('default.compileCommands', path.join(buildDir, 'compile_commands.json'), vscode.ConfigurationTarget.Workspace);
}

function detectGeneratorFromBuildTool(buildToolPathOrName: string) {
	const name = buildToolPathOrName.toLowerCase();
	if (name.includes('ninja')) {
		return 'Ninja';
	}
	if (name.includes('mingw32-make') || name === 'make.exe' || name === 'make') {
		return 'MinGW Makefiles'; // or 'Unix Makefiles' if you want
	}
	if (name.includes('jom')) {
		return 'NMake Makefiles';
	}
	if (name.includes('msbuild')) {
		return 'Visual Studio 17 2022';
	}
	return null;
}

function createCodeModelV1Query(buildDir: string) {
	const queryDir = path.join(buildDir, '.cmake', 'api', 'v1', 'query');

	fs.mkdirSync(queryDir, { recursive: true });

	const queryFileToolChains = path.join(queryDir, 'toolchains-v1');
	fs.writeFileSync(queryFileToolChains, '');
	const queryFileCmakeFiles = path.join(queryDir, 'cmakeFiles-v1');
	fs.writeFileSync(queryFileCmakeFiles, '');

	const queryFileCodemodelv2 = path.join(queryDir, 'codemodel-v2');
	fs.writeFileSync(queryFileCodemodelv2, '');
	const queryFileCachev2 = path.join(queryDir, 'cache-v2');
	fs.writeFileSync(queryFileCachev2, '');
}

async function parseCMakeFileApiReply(buildDir: string) {
	const replyDir = path.join(buildDir, '.cmake', 'api', 'v1', 'reply');
	let file: string | null = await findIndexFile(replyDir);
	if (!file) {
		vscode.window.showErrorMessage('CMake File API index file not found');
		return;
	}
	let raw = fs.readFileSync(file, 'utf8');
	let json: any = JSON.parse(raw);

	let fileName: string = json?.reply?.["codemodel-v2"]?.jsonFile;
	if(!fileName) {
		return;
	}
	file = path.join(replyDir, fileName);
	raw = fs.readFileSync(file, 'utf8'); 

	json = JSON.parse(raw);

	const configurations = json?.configurations;
	if(!configurations) {
		return;
	}

	let targets;
	if (Array.isArray(configurations)) {
		for (const entry of configurations) {
			targets = entry?.targets;
			if (targets) {
				break;
			}
		}
	}
	let buildTargets: BuildTargets[] = [];
	for(const target of targets) {
		console.log(`target: ${target?.name} ,file: ${target.jsonFile}`);
		fileName = target?.jsonFile;

		if(!fileName) {
			return;
		}
		file = path.join(replyDir, fileName);
		raw = fs.readFileSync(file, 'utf8'); 
		
		json = JSON.parse(raw);

		const artifactPaths: string[] = json.artifacts?.map((a: any) => a.path) ?? [];

		let buildTarget: BuildTargets = {
			name: target?.name ?? "",
			artifacts: artifactPaths
		};
		buildTargets.push(buildTarget);
	}
	setAvaliableTargets(buildTargets);
}

async function findIndexFile(replyDir: string): Promise<string | null> {
	const files = await fs.promises.readdir(replyDir);
	const indexFile = files.find(f => f.startsWith('index-') && f.endsWith('.json'));
	return indexFile ? path.join(replyDir, indexFile) : null;
}