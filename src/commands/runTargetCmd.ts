import * as vscode from 'vscode';
import { runSelectedTarget } from '../cmakeTools';

export function registerRunTargetCommand(context: vscode.ExtensionContext) {

   const cmd = vscode.commands.registerCommand('cmaketoolchains.runTarget', async () => {
      await vscode.commands.executeCommand('cmaketoolchains.buildTarget');
      const selectedTarget: string = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedTarget') || '';

      runSelectedTarget(selectedTarget);

      vscode.window.showInformationMessage('target Run: in progress');
   });
   context.subscriptions.push(cmd);
}