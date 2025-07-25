import * as vscode from 'vscode';
import * as path from 'path';
import { runCMakeSyncCommand, updateC_CppExtensionCompileCommands } from '../cmakeTools';
import { buildPath, projectPath } from '../globals';

export function registerSyncCMakeCommand(context: vscode.ExtensionContext) {
   const cmd = vscode.commands.registerCommand('cmaketoolchains.syncCMake', async () => {
		if (!projectPath) {
			vscode.window.showErrorMessage('No projectPath!');
			return;
		}

      runCMakeSyncCommand(projectPath);
      if(buildPath) {
         updateC_CppExtensionCompileCommands(buildPath);
      }

      vscode.window.showInformationMessage('Configuring cmake project Test');
   });
   context.subscriptions.push(cmd);
}