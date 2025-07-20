import * as vscode from 'vscode';

export function registerConfigureToolchainsCommand(context: vscode.ExtensionContext) {

   const cmd = vscode.commands.registerCommand('cmaketoolchains.configureToolchains', async () => {
      vscode.window.showInformationMessage('target Run: in progress');
   });
   context.subscriptions.push(cmd);
}