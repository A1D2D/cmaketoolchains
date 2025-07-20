import * as vscode from 'vscode';
import * as path from 'path';
import { runCMakeSyncCommand, getCleanCMakeTargets, updateC_CppExtensionCompileCommands } from '../cmakeTools';
import { activeBuildDir, setAvaliableTargets } from '../globals';

export function registerSyncCMakeCommand(context: vscode.ExtensionContext) {
   const cmd = vscode.commands.registerCommand('cmaketoolchains.syncCMake', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
		if (!workspaceFolders) {
			vscode.window.showErrorMessage('No workspace folder open!');
			return;
		}

		const projectPath = workspaceFolders[0].uri.fsPath;

      runCMakeSyncCommand(projectPath);
      if(activeBuildDir) {
         updateC_CppExtensionCompileCommands(path.join(projectPath, activeBuildDir));
      }

      vscode.window.showInformationMessage('Configuring cmake project Test');
   });
   context.subscriptions.push(cmd);
}