import * as vscode from 'vscode';
import { CompileCommandsManager } from '../cmakeTools';


export function registerCompileCommandsCommand(context: vscode.ExtensionContext) {
   const manager = new CompileCommandsManager(context);

   const showStatusCommand = vscode.commands.registerCommand('cmaketoolchains.showCompileCommandStatus', () => {
      const status = manager.getConfigurationStatus();
      const statusText = status.map(s =>
         `${s.extension}: ${s.available ? '✓' : '✗'} available, ${s.configured ? '✓' : '✗'} configured`
      ).join('\n');

      vscode.window.showInformationMessage('Compile Commands Configuration Status', {
         modal: true,
         detail: statusText
      });
   });

   context.subscriptions.push(showStatusCommand);
}