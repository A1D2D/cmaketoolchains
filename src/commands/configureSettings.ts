import * as vscode from 'vscode';

export function registerConfigureSettingsCommand(context: vscode.ExtensionContext) {
   const cmd = vscode.commands.registerCommand('cmaketoolchains.configureSettings', async () => {
      const options = ['configure cmake: toolchains', 'configure cmake: profiles', 'configure cmake: targets'];
      const selected = await vscode.window.showQuickPick(options, {
			placeHolder: 'Configure Cmake'
		});
		switch (selected) {
			case 'configure cmake: toolchains':
				vscode.commands.executeCommand('cmaketoolchains.configureToolchains');
				break;
			case 'configure cmake: profiles':
				vscode.commands.executeCommand('cmaketoolchains.configureProfiles');
				break;
			case 'configure cmake: targets':
				vscode.commands.executeCommand('cmaketoolchains.configureTargets');
				break;
			default:
				break;
		}
   });
   context.subscriptions.push(cmd);
}