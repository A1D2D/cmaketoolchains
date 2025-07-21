import * as vscode from 'vscode';
import { avaliableTargets } from '../globals';
import * as path from 'path';

export function registerDebugTargetCommand(context: vscode.ExtensionContext) {

   const cmd = vscode.commands.registerCommand('cmaketoolchains.debugTarget', async () => {
      await vscode.commands.executeCommand('cmaketoolchains.buildTarget');
      const selectedTarget: string = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedTarget') || '';

      const target = avaliableTargets?.find(t => t.name === selectedTarget);
      if (!target || !target.artifacts || target.artifacts.length === 0) {
         vscode.window.showErrorMessage('Target or artifact not found.');
         return;
      }

      const exePath = target.artifacts[0];
      debugInTerminal(exePath, []);
      vscode.window.showInformationMessage('target Debug: in progress');
   });
   context.subscriptions.push(cmd);
}

export async function debugInTerminal(exePath: string, args: string[] = []) {
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