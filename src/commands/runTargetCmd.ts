import * as vscode from 'vscode';

export function registerRunTargetCommand(context: vscode.ExtensionContext) {

   const cmd = vscode.commands.registerCommand('cmaketoolchains.runTarget', async () => {
      vscode.window.showInformationMessage('target Run: in progress');
   });
   context.subscriptions.push(cmd);
}