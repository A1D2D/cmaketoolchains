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
	registerDebugTargetCommand,
	registerCompileCommandsCommand
} from './commands';
import { initProjectFolder, setContext } from './globals';
import { isCMakeProject, updateContext } from './cmakeTools/utilities';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Extension "cmaketoolchains" is now active!');

	updateContext();

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
	registerCompileCommandsCommand(context);

	context.subscriptions.push(
		vscode.workspace.onDidCreateFiles(updateContext),
		vscode.workspace.onDidDeleteFiles(updateContext),
		vscode.workspace.onDidRenameFiles(updateContext),
		vscode.workspace.onDidChangeWorkspaceFolders(updateContext)
	);

	if(await isCMakeProject()) {
		vscode.commands.executeCommand("cmaketoolchains.syncCMake");
	}
}
