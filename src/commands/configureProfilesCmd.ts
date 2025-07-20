import * as vscode from 'vscode';

export function registerConfigureProfilesCommand(context: vscode.ExtensionContext) {

   const cmd = vscode.commands.registerCommand('cmaketoolchains.configureProfiles', async () => {
      vscode.window.showInformationMessage('target Run: in progress');
   });
   context.subscriptions.push(cmd);
}