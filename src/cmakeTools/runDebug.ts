import * as vscode from 'vscode';
import { avaliableTargets, buildToolEnv, BuildToolEnv, Profile, profiles, projectPath, runConfigs, RunDebugConfig, setProfiles, setRunConfigs, setToolchains, Toolchain, toolchains } from '../globals';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';

import * as jsonc from 'jsonc-parser';

export function parseLaunchConfig(): RunDebugConfig[] {
   if (!projectPath) {
      vscode.window.showErrorMessage('Project path invalid.');
      return [];
   }

   const launchFilePath = path.join(projectPath, '.vscode', 'launch.json');
   if (!fs.existsSync(launchFilePath)) {
      return [];
   }

   const raw = fs.readFileSync(launchFilePath, 'utf8');
   const json: any = jsonc.parse(raw);
   const configurations = json?.configurations;
   if (!Array.isArray(configurations)) {
      return [];
   }

   const configs: RunDebugConfig[] = [];

   for (const entry of configurations) {
      if (entry?.type !== 'cmake-toolchains' || entry?.request !== 'launch') {
         continue;
      }
      if (!entry.name || !entry.target || !entry.executable) {
         continue;
      }

      const config: RunDebugConfig = {
         name: entry.name,
         target: entry.target,
         executable: entry.executable,
         programArgs: entry.programArgs ?? undefined,
         workDir: entry.workDir ?? undefined,
         environment: entry.environment ?? undefined,
         runAdmin: entry.runAdmin ?? false,
         runExternal: entry.runExternal ?? false,
      };

      configs.push(config);
   }

   return configs;
}

export async function saveLaunchConfig(newConfig: RunDebugConfig) {
   if (!projectPath) {
      vscode.window.showErrorMessage('Project path invalid.');
      return;
   }

   const launchFilePath = path.join(projectPath, '.vscode', 'launch.json');
   let raw = '';
   try {
      raw = fs.readFileSync(launchFilePath, 'utf8');
   } catch {
      raw = `{\n  "version": "0.2.0",\n  "configurations": []\n}`;
   }

   const newEntry = {
      type: 'cmake-toolchains',
      request: 'launch',
      name: newConfig.name,
      target: newConfig.target,
      executable: newConfig.executable,
      programArgs: newConfig.programArgs,
      workDir: newConfig.workDir,
      environment: newConfig.environment,
      runAdmin: newConfig.runAdmin ?? false,
      runExternal: newConfig.runExternal ?? false,
   };

   const edits = jsonc.modify(
      raw,
      ['configurations'],
      (prev: any[]) => {
         const idx = prev.findIndex(c => c.name === newConfig.name && c.type === 'cmake-toolchains');
         if (idx >= 0) {
            prev[idx] = newEntry; // Update
         } else {
            prev.push(newEntry); // Add
         }
         return prev;
      },
      { formattingOptions: { insertSpaces: true, tabSize: 2 } }
   );

   const updated = jsonc.applyEdits(raw, edits);
   fs.mkdirSync(path.dirname(launchFilePath), { recursive: true });
   fs.writeFileSync(launchFilePath, updated, 'utf-8');

   // vscode.window.showInformationMessage(`Saved config "${newConfig.name}" to launch.json`);
}

export async function runSelectedTarget(selectedTarget: string) {
   const target = avaliableTargets?.find(t => t.name === selectedTarget);
   if (!target || !target.artifacts || target.artifacts.length === 0) {
      vscode.window.showErrorMessage('Target or artifact not found.');
      return;
   }

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

   const exePath = target.artifacts[0];

   setRunConfigs(parseLaunchConfig());

   const defaults: RunDebugConfig = {
      name: `${path.basename(exePath)}`,
      target: `${selectedTarget}`,
      executable: `${selectedTarget}`,
      programArgs: [],
      workDir: `${path.dirname(exePath)}`,
      runAdmin: false,
      runExternal: false
   };

   const targetConfig: RunDebugConfig = runConfigs.find(cfg => cfg.executable === selectedTarget) || defaults;

   const sConfig: RunDebugConfig = {
      name: targetConfig.name ?? defaults.name,
      target: targetConfig.target ?? defaults.target,
      executable: targetConfig.executable ?? defaults.executable,
      programArgs: targetConfig.programArgs ?? defaults.programArgs,
      workDir: targetConfig.workDir ?? defaults.workDir,
      runAdmin: targetConfig.runAdmin ?? defaults.runAdmin,
      runExternal: targetConfig.runExternal ?? defaults.runExternal,
   };

   if(sConfig.runExternal) {
      runInExternalConsole(exePath, sConfig, profile, toolchain);
   } else {
      runInVsCode(exePath, sConfig, profile, toolchain);
   }
}

export async function debugSelectedTarget(selectedTarget: string) {
   const target = avaliableTargets?.find(t => t.name === selectedTarget);
   if (!target || !target.artifacts || target.artifacts.length === 0) {
      vscode.window.showErrorMessage('Target or artifact not found.');
      return;
   }

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

   const exePath = target.artifacts[0];

   setRunConfigs(parseLaunchConfig());

   const defaults: RunDebugConfig = {
      name: `${path.basename(exePath)}`,
      target: `${selectedTarget}`,
      executable: `${selectedTarget}`,
      programArgs: [],
      workDir: `${path.dirname(exePath)}`,
      runAdmin: false,
      runExternal: false
   };

   const targetConfig: RunDebugConfig = runConfigs.find(cfg => cfg.executable === selectedTarget) || defaults;

   const sConfig: RunDebugConfig = {
      name: targetConfig.name ?? defaults.name,
      target: targetConfig.target ?? defaults.target,
      executable: targetConfig.executable ?? defaults.executable,
      programArgs: targetConfig.programArgs ?? defaults.programArgs,
      workDir: targetConfig.workDir ?? defaults.workDir,
      runAdmin: targetConfig.runAdmin ?? defaults.runAdmin,
      runExternal: targetConfig.runExternal ?? defaults.runExternal,
   };

   debugSomewhere(exePath, sConfig, profile, toolchain, buildToolEnv || {compilerId: '', compilerPath:''});
}

function runInExternalConsole(exePath: string, config: RunDebugConfig, profile: Profile, toolchain: Toolchain) {
   if (process.platform !== 'win32') {
      runInVsCode(exePath, config, profile, toolchain);
      vscode.window.showWarningMessage("External CMD launch only works on Windows.");
      return;
   }

   if(config.runAdmin) {
      vscode.window.showWarningMessage("Please run VSCode as an administrator. The 'runAdmin' flag is not supported and should be ignored if VSCode is already running with elevated privileges.");
   }

   const args = config.programArgs?.join(' ') ?? '';
   const fullCommand = `"${exePath}" ${args}`;
   const workDir = config.workDir ?? path.dirname(exePath);

   cp.exec(`cmd.exe /c start cmd.exe /k ${fullCommand}`, {
      cwd: config.workDir,
      env: {
         ...process.env,
         ...(profile.environment ?? {}),
         ...(config.environment ?? {}),
         PATH: `${toolchain.toolsetFolder}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`
      },
   }).unref();
}

function runInVsCode(exePath: string, config: RunDebugConfig, profile: Profile, toolchain: Toolchain) {
   const cmd = `"${exePath}" ${config.programArgs?.join(' ')}`;

   if(config.runAdmin) {
      vscode.window.showWarningMessage("Please run VSCode as an administrator. The 'runAdmin' flag is not supported and should be ignored if VSCode is already running with elevated privileges.");
   }

   const terminal = vscode.window.createTerminal({
      name: `Run ${config.name}`,
      cwd: config.workDir,
      hideFromUser: false,
      env: {
         ...process.env,
         ...(profile.environment ?? {}),
         ...(config.environment ?? {}),
         PATH: `${toolchain.toolsetFolder}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`
      }
   });

   terminal.show(true);
   
   terminal.sendText(cmd);
}

async function debugSomewhere(exePath: string, config: RunDebugConfig, profile: Profile, toolchain: Toolchain, buildToolEnv: BuildToolEnv) {
   if(config.runAdmin) {
      vscode.window.showWarningMessage("Please run VSCode as an administrator. The 'runAdmin' flag is not supported and should be ignored if VSCode is already running with elevated privileges.");
   }

   const mergedEnv = {
      ...process.env,
      ...(profile.environment ?? {}),
      ...(config.environment ?? {}),
      PATH: `${toolchain.toolsetFolder}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`
   };

   const environmentArray = Object.entries(mergedEnv).map(([name, value]) => ({
      name, value: String(value)
   }));

   const dbgConfig: vscode.DebugConfiguration = {
      name: `Debug ${config.name}`,
      type: `${buildToolEnv?.compilerId === 'MSVC' ? 'cppvsdbg' : 'cppdbg'}`,
      request: 'launch',
      program: exePath,
      args: config.programArgs?.join(' '),
      cwd: config.workDir,
      stopAtEntry: false,
      console: 'externalTerminal',
      runInExternalConsole: config.runExternal,
      MIMode: `${buildToolEnv?.compilerId === 'MSVC' ? 'cppvsdbg' : (process.platform === 'win32' ? 'gdb' : 'lldb')}`,
      environment: environmentArray
   };

   const folder = vscode.workspace.workspaceFolders?.[0];
   const success = await vscode.debug.startDebugging(folder, dbgConfig);
   if (success) {
      setTimeout(() => {
         vscode.window.activeTerminal?.show(true);
      }, 1000);
   } else {
      vscode.window.showErrorMessage('Failed to start debugger');
   }
}