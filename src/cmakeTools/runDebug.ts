import * as vscode from 'vscode';
import { avaliableTargets, projectPath, RunDebugConfig } from '../globals';
import * as path from 'path';
import * as fs from 'fs';

export function parseLaunchConfig(selectedTarget: string): RunDebugConfig | null {
   if(!projectPath) {
      vscode.window.showErrorMessage('project path invalid.');
      return null;
   }
   const launchFilePath = path.join(projectPath, '.vscode', 'launch.json');
   if (!launchFilePath) {
      return null;
   }
   const raw = fs.readFileSync(launchFilePath, 'utf8');
   const json:any = JSON.parse(raw);

   const configurations = json?.configurations;
	if (!configurations) {
		return null;
	}

   let runDebugConfig: RunDebugConfig | null = null;

	if (Array.isArray(configurations)) {
		for (const entry of configurations) {
         if(entry?.type !== 'cmake-toolchains') {
            continue;
         }
         if(entry?.request !== 'launch') {
            continue;
         }
         if(entry?.executeable === selectedTarget) {
            runDebugConfig = {
               name: `${selectedTarget}`,
               target: `${selectedTarget}`,
               executeable: `${selectedTarget}`,
               programArgs: '',
               workDir: '',
               envVars: '',
               runAdmin: false,
               runExternal: false
            };
            if(entry?.name) {
               runDebugConfig.name = entry.name;
            }
            if(entry?.target) {
               runDebugConfig.target = entry.target;
            }
            if(entry?.programArgs) {
               runDebugConfig.programArgs = entry.programArgs;
            }
            if(entry?.workDir) {
               runDebugConfig.workDir = entry.workDir;
            }
            if(entry?.envVars) {
               runDebugConfig.envVars = entry.envVars;
            }
            if(entry?.runAdmin) {
               runDebugConfig.runAdmin = entry.runAdmin;
            }
            if(entry?.runExternal) {
               runDebugConfig.runExternal = entry.runExternal;
            }

            break;
         }
		}
	}

   return runDebugConfig;
}

export async function runSelectedTarget(selectedTarget: string) {
   const target = avaliableTargets?.find(t => t.name === selectedTarget);
   if (!target || !target.artifacts || target.artifacts.length === 0) {
      vscode.window.showErrorMessage('Target or artifact not found.');
      return;
   }
   const targetConfig = parseLaunchConfig(selectedTarget);

   if(targetConfig) {
      console.log(targetConfig);
   }

   const exePath = target.artifacts[0];
   runInTerminal(exePath, []);
}

export function debugSelectedTarget(selectedTarget: string) {
   const target = avaliableTargets?.find(t => t.name === selectedTarget);
   if (!target || !target.artifacts || target.artifacts.length === 0) {
      vscode.window.showErrorMessage('Target or artifact not found.');
      return;
   }

   const exePath = target.artifacts[0];
   debugInTerminal(exePath, []);
}

function runInTerminal(exePath: string, args: string[] = []) {
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

async function debugInTerminal(exePath: string, args: string[] = []) {
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