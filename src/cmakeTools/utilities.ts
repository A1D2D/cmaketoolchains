import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ExecOptions } from 'child_process';

import {context, toolchains, profiles, buildPath, setToolchains, setProfiles, setBuildPath, BuildTargets, setAvaliableTargets, resolvePath, setRunConfigs, runConfigs, setBuildToolEnv } from '../globals';
import { parseLaunchConfig } from './runDebug';
import * as cc from './compileCommands';

export async function runCMakeSyncCommand(projectPath: string) {
	return new Promise<void>((resolve, reject) => {
		const config = vscode.workspace.getConfiguration('cmaketoolchains');
		setProfiles(config.get('cmakeProfiles') || []);

		const cmakeSelectedProfile = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedProfile');
		const profile = profiles.find(p => p.name === cmakeSelectedProfile);
		if (!profile) {
			vscode.window.showErrorMessage("Selected profile not found.");
			reject(new Error("Selected profile not found."));
			return;
		}

		setToolchains(config.get('cmakeToolchains') || []);
		const toolchain = toolchains.find(tc => tc.name === profile.toolchain);

		if (!toolchain) {
			vscode.window.showErrorMessage("Toolchain not found set by the current selected cmake profile.");
			reject(new Error("Toolchain not found set by the current selected cmake profile."));
			return;
		}

		const output = vscode.window.createOutputChannel('CMake Build Config');
		output.clear();
		output.show(true);
		output.appendLine(`[CMake] Configuring in ${projectPath}...`);

		let buildDir: string | null = extractBuildPath(profile.cmakeOptions);

		if(!buildDir) {
			buildDir = profile.buildDirectory ? profile.buildDirectory : (profile.buildType ? `build-${profile.buildType.toLowerCase()}` : 'build');
		}

		setBuildPath(resolvePath(buildDir));

		const cmakeExecutable = toolchain.cmake || 'cmake';

		const buildType = profile.buildType ? `-DCMAKE_BUILD_TYPE=${profile.buildType}` : '';
		const buildTool = toolchain.buildTool ? `-DCMAKE_MAKE_PROGRAM=${toolchain.buildTool}` : '';
		const cCompiler = toolchain.ccompiler ? `-DCMAKE_C_COMPILER=${toolchain.ccompiler}` : '';
		const cppCompiler = toolchain.cppcompiler ? `-DCMAKE_CXX_COMPILER=${toolchain.cppcompiler}` : '';
		
		const buildToolType = toolchain.buildTool ? detectGeneratorFromBuildTool(toolchain.buildTool) : '';
		const generatorValue = profile.generator || buildToolType;
		const generator = generatorValue ? `-G "${generatorValue}"` : '';

		const sourceFlag = '-S .';
		const buildFlag = `-B ${buildPath}`;

		const cmakeOpStr = formatFlagList(profile.cmakeOptions);

		const cmakeCmd = [
			cmakeExecutable,
			cmakeOpStr.includes('-DCMAKE_BUILD_TYPE')   ? '' : buildType,
			cmakeOpStr.includes('-DCMAKE_MAKE_PROGRAM') ? '' : buildTool,
			cmakeOpStr.includes('-DCMAKE_C_COMPILER')   ? '' : cCompiler,
			cmakeOpStr.includes('-DCMAKE_CXX_COMPILER') ? '' : cppCompiler,
			cmakeOpStr.includes('-G')                   ? '' : generator,
			cmakeOpStr.includes('-S')                   ? '' : sourceFlag,
			cmakeOpStr.includes('-B')                   ? '' : buildFlag,
			cmakeOpStr,
			'-DCMAKE_EXPORT_COMPILE_COMMANDS=ON'
		].filter(Boolean).join(' ');

		const options: ExecOptions = {
			cwd: projectPath,
			env: {
				...process.env,
				...(profile.environment ?? {}),
				PATH: `${toolchain.toolsetFolder}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`
			}
		};

		if(!buildPath) {
			vscode.window.showErrorMessage("Build path undefined.");
			reject(new Error("[Error] Build path undefined."));
			return;
		}

		output.appendLine(`creating V1 Query files in build directory: ${buildPath}`);
		output.appendLine(`executed cmake command: ${cmakeCmd}`);

		createCodeModelV1Query(buildPath);
		const child = cp.exec(cmakeCmd, options);

		if (!child) {
			output.appendLine('[Error] Failed to start CMake process.');
			reject(new Error("[Error] Failed to start CMake process."));
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
				if(!buildPath) {
					vscode.window.showErrorMessage("Build path undefined.");
					reject(new Error("Build path undefined."));
					return;
				}
				output.appendLine("parse file API");
				parseCMakeFileApiReply(buildPath);
				getCMakeCompilerInfo(buildPath);
				resolve();
			}
		});
	});
}

export async function runCMakeTargetBuild(projectPath: string, buildDirPath: string, targetName: string) {
	return new Promise((resolve) => {
		const output = vscode.window.createOutputChannel('CMake Build');
		output.clear();
		output.show(true);

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

		setRunConfigs(parseLaunchConfig());
		
		const buildTarget = runConfigs.find(cfg => cfg.executable === targetName)?.target || `${targetName}`;

		const buildOptions = formatFlagList(profile.buildOptions);

		const buildDirFlag = `--build "${buildDirPath}"`;
		const buildTargetFlag = `--target "${buildTarget}"`;

		const cmakeCmd = [
			'cmake',
			`${buildOptions.includes("--build") ? '' : buildDirFlag}`,
			`${buildOptions.includes("--target") ? '' : buildTargetFlag}`,
			`${buildOptions}`
		].filter(Boolean).join(' ');

		const options: ExecOptions = {
			cwd: projectPath,
			env: {
				...process.env,
				...(profile.environment ?? {}),
				PATH: `${toolchain.toolsetFolder}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`
			}
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
				resolve(false);
			} else {
				output.appendLine('[Info] CMake finished successfully.');
				resolve(true);
			}
		});
	});
}

export async function updateCompileCommands(buildDir: string) {
	// const compileCommandsPath = path.join(buildDir, 'compile_commands.json');
	if(!context) {
		console.log('default fallback');
		await cc.updateCompileCommandsEx(buildDir);
		return;
	}
	console.log('use custom');
	const manager = new cc.CompileCommandsManager(context);
	await manager.updateCompileCommands(buildDir);
}

function detectGeneratorFromBuildTool(buildToolPathOrName: string) {
	const name = buildToolPathOrName.toLowerCase();
	if (name.includes('ninja')) {
		return 'Ninja';
	}
	if (name.includes('mingw32-make') || name === 'make.exe' || name === 'make') {
		return 'MinGW Makefiles'; // 'Unix Makefiles'
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

function formatFlagList(flags?: string[]): string {
   if (!flags || flags.length === 0) {
		return '';
	}
   return flags.map(flag => `${flag}`).join(' ');
}

function extractBuildPath(options: string[] | undefined): string | null {
   if (!options) {
		return null;
	}

   for (let i = options.length - 1; i >= 0; --i) {
      const opt = options[i];

      if (opt === '-B' && options[i + 1]) {
         return options[i + 1];
      }

      const match = opt.match(/^[-/]B(.+)/);
      if (match) {
         return match[1];
      }
   }

   return null;
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
	if (!fileName) {
		return;
	}
	file = path.join(replyDir, fileName);
	raw = fs.readFileSync(file, 'utf8');

	json = JSON.parse(raw);

	const configurations = json?.configurations;
	if (!configurations) {
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
	for (const target of targets) {
		console.log(`target: ${target?.name} ,file: ${target.jsonFile}`);
		fileName = target?.jsonFile;

		if (!fileName) {
			return;
		}
		file = path.join(replyDir, fileName);
		raw = fs.readFileSync(file, 'utf8');

		json = JSON.parse(raw);

		const artifactPaths: string[] = (json.artifacts?.map((a: any) => {
			let p = a.path;
			if (!path.isAbsolute(p)) {
				p = path.join(buildDir, p);
			}
			return path.normalize(p);
		})) ?? [];

		let buildTarget: BuildTargets = {
			name: target?.name ?? "",
			artifacts: artifactPaths
		};
		buildTargets.push(buildTarget);
	}
	// console.log(buildTargets);
	setAvaliableTargets(buildTargets);
}

async function findIndexFile(replyDir: string): Promise<string | null> {
	const files = await fs.promises.readdir(replyDir);
	const indexFile = files.find(f => f.startsWith('index-') && f.endsWith('.json'));
	return indexFile ? path.join(replyDir, indexFile) : null;
}

function getCMakeCompilerInfo(buildDir: string) {
	const cacheFilePath = path.join(buildDir, 'CMakeCache.txt');
	const cache = fs.readFileSync(cacheFilePath, 'utf-8');
	const compilerId = cache.match(/^CMAKE_CXX_COMPILER_ID:INTERNAL=(.*)$/m)?.[1] ?? undefined;
	const compilerPath = cache.match(/^CMAKE_CXX_COMPILER:FILEPATH=(.*)$/m)?.[1] ?? undefined;
	setBuildToolEnv({
		compilerId: compilerId, 
		compilerPath: compilerPath
	});
}