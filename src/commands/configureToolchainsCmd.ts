import * as vscode from 'vscode';
import { openToolchainManagerPanel } from '../webview/panels';

export function registerConfigureToolchainsCommand(context: vscode.ExtensionContext) {

   const cmd = vscode.commands.registerCommand('cmaketoolchains.configureToolchains', async () => {

      vscode.window.showInformationMessage('Configure Toolchains: in progress');
      openToolchainManagerPanel("Configure Toolchains");
   });
   context.subscriptions.push(cmd);
}