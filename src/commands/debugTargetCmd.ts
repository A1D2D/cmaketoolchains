import * as vscode from 'vscode';
import { debugSelectedTarget } from '../cmakeTools';

export function registerDebugTargetCommand(context: vscode.ExtensionContext) {

   const cmd = vscode.commands.registerCommand('cmaketoolchains.debugTarget', async () => {
      await vscode.commands.executeCommand('cmaketoolchains.buildTarget');
      const selectedTarget: string = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedTarget') || '';

      debugSelectedTarget(selectedTarget);
      vscode.window.showInformationMessage('target Debug: in progress');
   });
   context.subscriptions.push(cmd);
}