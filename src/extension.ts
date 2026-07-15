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
import { initProjectFolder, PsudoTerminalManager, setContext, setTerminalMannager, terminalMrg } from './globals';
import { isCMakeProject, updateContext } from './cmakeTools/utilities';
import { onTaskEnded } from './cmakeTools/runDebug';
import { registerCreateProjectCommand } from './commands/createProjectCmd';

export async function activate(context: vscode.ExtensionContext) {
	console.log('Extension "cmaketoolchains" is now active!');

	updateContext();

	initProjectFolder();

	setContext(context);

	const terminalMrg = new PsudoTerminalManager();
	terminalMrg.init(context);
	setTerminalMannager(terminalMrg);

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
	registerCreateProjectCommand(context);

	context.subscriptions.push(
		vscode.workspace.onDidCreateFiles(updateContext),
		vscode.workspace.onDidDeleteFiles(updateContext),
		vscode.workspace.onDidRenameFiles(updateContext),
		vscode.workspace.onDidChangeWorkspaceFolders(updateContext),
		vscode.tasks.onDidEndTaskProcess(onTaskEnded),
	);

	context.subscriptions.push(
		vscode.tasks.registerTaskProvider("cmaketoolchains-run", {
			provideTasks() {
				return [];
			},

			resolveTask(task) {
				return task;
			}
		})
	);

	if(await isCMakeProject()) {
		vscode.commands.executeCommand("cmaketoolchains.syncCMake");
	}
}
