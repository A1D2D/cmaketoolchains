import * as vscode from 'vscode';

import {
	registerSelectProfileCommand,
	registerSelectTargetCommand,
	registerRunTargetCommand,
	registerBuildTargetCommand,
	registerConfigureSettingsCommand,
	registerSyncCMakeCommand,
	registerConfigureToolchainsCommand,
	registerConfigureProfilesCommand,
	registerConfigureTargetsCommand, 
	registerDebugTargetCommand
} from './commands';
import { initProjectFolder, setContext } from './globals';

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "cmaketoolchains" is now active!');

	initProjectFolder();

	setContext(context);

	registerSelectProfileCommand(context);
	registerSelectTargetCommand(context);
	registerBuildTargetCommand(context);
	registerRunTargetCommand(context);
	registerDebugTargetCommand(context);
	registerConfigureSettingsCommand(context);
	registerSyncCMakeCommand(context);
	registerConfigureToolchainsCommand(context);
	registerConfigureProfilesCommand(context);
	registerConfigureTargetsCommand(context);

	vscode.commands.executeCommand("cmaketoolchains.syncCMake");
}

export function deactivate() {}
