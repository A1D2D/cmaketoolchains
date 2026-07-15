import * as vscode from 'vscode';
import { runCMakeSyncCommand, runCMakeTargetBuild } from '../cmakeTools';
import { buildPath, projectPath } from '../globals';

export function registerBuildTargetCommand(context: vscode.ExtensionContext) {
   const cmd = vscode.commands.registerCommand('cmaketoolchains.buildTarget', async () => {

      const selectedTargetName: string = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedTarget') || '';

      if(!buildPath || !projectPath) {
         vscode.window.showErrorMessage('No buildPath or projectPath');
         return;
      }
      if(vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSyncOnBuild')) {
         try {
            await runCMakeSyncCommand(projectPath);
         } catch (error) {
            vscode.window.showErrorMessage(`${error}`);
         }
      }
      try {
         await runCMakeTargetBuild(projectPath, buildPath, selectedTargetName);
      } catch (error) {
         vscode.window.showErrorMessage(`${error}`);
      }
   });
   context.subscriptions.push(cmd);
}