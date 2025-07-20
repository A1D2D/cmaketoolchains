import * as vscode from 'vscode';
import { toolchains, profiles, activeBuildDir, setToolchains, setProfiles, setActiveBuildDir} from '../globals';

let profileStatusBar: vscode.StatusBarItem;

export function registerSelectProfileCommand(context: vscode.ExtensionContext) {
   profileStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 5);
   profileStatusBar.command = "cmaketoolchains.selectProfile";

   const startupLoadedProfile: string = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedProfile') || '';
	if (startupLoadedProfile) {
		updateProfileStatusBar(startupLoadedProfile);
	} else {
      updateProfileStatusBar('default');
   }

   const cmd = vscode.commands.registerCommand('cmaketoolchains.selectProfile', async () => {
      const editString = '[Edit CMake Profiles]';
      const config = vscode.workspace.getConfiguration('cmaketoolchains');
      setProfiles(config.get('cmakeProfiles') || []);

      let profileNames: string[] = profiles.map(profile => profile.name).filter(Boolean);
      profileNames.push(editString);

      const selected = await vscode.window.showQuickPick(profileNames, {
			placeHolder: 'Select CMake Profile'
		});

      if (editString === selected) {
			vscode.commands.executeCommand('cmaketoolchains.configureProfiles');
			return;
		}

      if (selected) {
			vscode.workspace.getConfiguration().update('cmaketoolchains.cmakeSelectedProfile', selected, vscode.ConfigurationTarget.Workspace);
			updateProfileStatusBar(selected);
		}
   });
   context.subscriptions.push(cmd);
}

function updateProfileStatusBar(selectedProfile: string) {
   profileStatusBar.text = `Profile: ${selectedProfile}`;
   profileStatusBar.tooltip = 'Click to change cmake profile';
   profileStatusBar.show();
}