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
	registerConfigureTargetsCommand
} from './commands';

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "cmaketoolchains" is now active!');

	registerSelectProfileCommand(context);
	registerSelectTargetCommand(context);
	registerRunTargetCommand(context);
	registerBuildTargetCommand(context);
	registerConfigureSettingsCommand(context);
	registerSyncCMakeCommand(context);
	registerConfigureToolchainsCommand(context);
	registerConfigureProfilesCommand(context);
	registerConfigureTargetsCommand(context);
}

export function deactivate() {}
