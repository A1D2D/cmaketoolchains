import * as vscode from 'vscode';
import { runCMakeSyncCommand, updateCompileCommands } from '../cmakeTools';
import { buildPath, projectPath } from '../globals';

export function registerSyncCMakeCommand(context: vscode.ExtensionContext) {
   const cmd = vscode.commands.registerCommand('cmaketoolchains.syncCMake', async () => {
		if (!projectPath) {
			vscode.window.showErrorMessage('No projectPath!');
			return;
		}

      try {
         await runCMakeSyncCommand(projectPath);
      } catch (error) {
         vscode.window.showErrorMessage(`${error}`);
      }
      
      if(buildPath) {
         updateCompileCommands(buildPath);
      }

      // vscode.window.showInformationMessage('Configuring cmake project Test');
   });
   context.subscriptions.push(cmd);
}