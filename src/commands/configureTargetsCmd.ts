import * as vscode from 'vscode';

export function registerConfigureTargetsCommand(context: vscode.ExtensionContext) {

   const cmd = vscode.commands.registerCommand('cmaketoolchains.configureTargets', async () => {
      vscode.window.showInformationMessage('target Run: in progress');
   });
   context.subscriptions.push(cmd);
}