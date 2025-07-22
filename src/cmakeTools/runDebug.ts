import * as vscode from 'vscode';
import { avaliableTargets, projectPath, runConfigs, RunDebugConfig, setRunConfigs } from '../globals';
import * as path from 'path';
import * as fs from 'fs';

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
      if (!entry.name || !entry.target || !entry.executeable) {
         continue;
      }

      const config: RunDebugConfig = {
         name: entry.name,
         target: entry.target,
         executeable: entry.executeable,
         programArgs: entry.programArgs ?? undefined,
         workDir: entry.workDir ?? undefined,
         envVars: entry.envVars ?? undefined,
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
      executeable: newConfig.executeable,
      programArgs: newConfig.programArgs,
      workDir: newConfig.workDir,
      envVars: newConfig.envVars,
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

   vscode.window.showInformationMessage(`Saved config "${newConfig.name}" to launch.json`);
}

export async function runSelectedTarget(selectedTarget: string) {
   const target = avaliableTargets?.find(t => t.name === selectedTarget);
   if (!target || !target.artifacts || target.artifacts.length === 0) {
      vscode.window.showErrorMessage('Target or artifact not found.');
      return;
   }

   setRunConfigs(parseLaunchConfig());

   const targetConfig = runConfigs.find(cfg => cfg.executeable === selectedTarget);

   if (targetConfig) {
      console.log(targetConfig);
   }

   const exePath = target.artifacts[0];
   const args: string[] = [];

   const exeName = path.basename(exePath);
   const fullCommand = `"${exePath}" ${args.join(' ')}`;

   const terminal = vscode.window.createTerminal({
      name: `Run ${exeName}`,
      cwd: path.dirname(exePath),
      hideFromUser: false
   });

   terminal.show(true);
   terminal.sendText(fullCommand);
}

export async function debugSelectedTarget(selectedTarget: string) {
   const target = avaliableTargets?.find(t => t.name === selectedTarget);
   if (!target || !target.artifacts || target.artifacts.length === 0) {
      vscode.window.showErrorMessage('Target or artifact not found.');
      return;
   }

   const exePath = target.artifacts[0];
   const args: string[] = [];

   const folder = vscode.workspace.workspaceFolders?.[0]; // Or pass this as parameter

   const config: vscode.DebugConfiguration = {
      name: `Debug ${path.basename(exePath)}`,
      type: 'cppdbg',
      request: 'launch',
      program: exePath,
      args: args,
      cwd: path.dirname(exePath),
      stopAtEntry: false,
      console: 'externalTerminal', // or "integratedTerminal" or "internalConsole"
      MIMode: process.platform === 'win32' ? 'gdb' : 'lldb', // or "gdb"/"lldb"/"cppvsdbg" depending on platform
   };

   const success = await vscode.debug.startDebugging(folder, config);
   if (!success) {
      vscode.window.showErrorMessage('Failed to start debugger');
   }
}