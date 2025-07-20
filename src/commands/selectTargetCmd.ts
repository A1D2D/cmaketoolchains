import * as vscode from 'vscode';
import { getAvaliableTargets } from '../globals';

let targetStatusBar: vscode.StatusBarItem;

export function registerSelectTargetCommand(context: vscode.ExtensionContext) {
   targetStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 4);
	targetStatusBar.command = 'cmaketoolchains.selectTarget';

   const startupLoadedTarget: string = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedTarget') || '';
	if (startupLoadedTarget) {
		updateTargetStatusBar(startupLoadedTarget);
	} else {
      updateTargetStatusBar('default');
   }

   const cmd = vscode.commands.registerCommand('cmaketoolchains.selectTarget', async () => {
      const editString = '[Edit Target Config]';

      const targets = getAvaliableTargets()?.map(target => target.name) || [];
      targets?.push(editString);

      const selected = await vscode.window.showQuickPick(targets, {
			placeHolder: 'Select Target'
		});

      if (editString === selected) {
			vscode.commands.executeCommand('cmaketoolchains.configureTargets');
			return;
		}

      if (selected) {
			vscode.workspace.getConfiguration().update('cmaketoolchains.cmakeSelectedTarget', selected, vscode.ConfigurationTarget.Workspace);
			updateTargetStatusBar(selected);
		}
   });
   context.subscriptions.push(cmd);
}

function updateTargetStatusBar(selectedTarget: string) {
   targetStatusBar.text = `Target: ${selectedTarget}`;
   targetStatusBar.tooltip = 'Click to change cmake target';
   targetStatusBar.show();
}