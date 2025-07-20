import * as vscode from 'vscode';

export function registerDebugTargetCommand(context: vscode.ExtensionContext) {

   const cmd = vscode.commands.registerCommand('cmaketoolchains.debugTarget', async () => {
      vscode.window.showInformationMessage('target Debug: in progress');
   });
   context.subscriptions.push(cmd);
}