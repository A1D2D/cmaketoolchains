import * as vscode from 'vscode';
import { activeBuildDir } from '../globals';
import path from 'path';
import { runCMakeTargetBuild } from '../cmakeTools';

export function registerBuildTargetCommand(context: vscode.ExtensionContext) {
   const cmd = vscode.commands.registerCommand('cmaketoolchains.buildTarget', async () => {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders) {
         vscode.window.showErrorMessage('No workspace folder open!');
         return;
      }

      const projectPath = workspaceFolders[0].uri.fsPath;
      const selectedTargetName: string = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedTarget') || '';

      runCMakeTargetBuild(projectPath, activeBuildDir ? path.join(projectPath, activeBuildDir) : '', selectedTargetName);
      vscode.window.showInformationMessage('target Build: in progress');
   });
   context.subscriptions.push(cmd);
}