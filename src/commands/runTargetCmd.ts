import * as vscode from 'vscode';
import * as path from 'path';
import { avaliableTargets } from '../globals';

export function registerRunTargetCommand(context: vscode.ExtensionContext) {

   const cmd = vscode.commands.registerCommand('cmaketoolchains.runTarget', async () => {
      await vscode.commands.executeCommand('cmaketoolchains.buildTarget');
      const selectedTarget: string = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedTarget') || '';

      const target = avaliableTargets?.find(t => t.name === selectedTarget);
      if (!target || !target.artifacts || target.artifacts.length === 0) {
         vscode.window.showErrorMessage('Target or artifact not found.');
         return;
      }

      const exePath = target.artifacts[0];
      runInTerminal(exePath, []);

      vscode.window.showInformationMessage('target Run: in progress');
   });
   context.subscriptions.push(cmd);
}

function runInTerminal(exePath: string, args: string[] = []) {
   const exeName = path.basename(exePath);
   const fullCommand = `"${exePath}" ${args.join(' ')}`;

   const terminal = vscode.window.createTerminal({
      name: `Run ${exeName}`,
      cwd: path.dirname(exePath),
      hideFromUser: false
   });

   terminal.show(true);
   terminal.sendText(fullCommand);
}