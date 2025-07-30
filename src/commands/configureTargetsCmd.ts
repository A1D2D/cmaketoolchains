import * as vscode from 'vscode';

export function registerConfigureTargetsCommand(context: vscode.ExtensionContext) {

   const cmd = vscode.commands.registerCommand('cmaketoolchains.configureTargets', async () => {
      vscode.window.showErrorMessage('target config: not yet implemented');
   });
   context.subscriptions.push(cmd);
}