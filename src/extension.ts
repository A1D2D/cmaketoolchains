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
import { initProjectFolder } from './globals';
import { CancellationToken, DebugConfiguration, ProviderResult, WorkspaceFolder } from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "cmaketoolchains" is now active!');

	const provider = new MockConfigurationProvider();
	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('cmaketoolchains', provider));

	context.subscriptions.push(vscode.debug.registerDebugConfigurationProvider('cmaketoolchains', {
		provideDebugConfigurations(folder: WorkspaceFolder | undefined): ProviderResult<DebugConfiguration[]> {
			return [
				{
					name: "Dynamic Launch",
					request: "launch",
					type: "cmaketoolchains",
					program: "${file}"
				},
				{
					name: "Another Dynamic Launch",
					request: "launch",
					type: "cmaketoolchains",
					program: "${file}"
				},
				{
					name: "Mock Launch",
					request: "launch",
					type: "cmaketoolchains",
					program: "${file}"
				}
			];
		}
	}, vscode.DebugConfigurationProviderTriggerKind.Dynamic));

	initProjectFolder();

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
}

export function deactivate() {}

class MockConfigurationProvider implements vscode.DebugConfigurationProvider {

	/**
	 * Massage a debug configuration just before a debug session is being launched,
	 * e.g. add all missing attributes to the debug configuration.
	 */
	resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration> {

		// if launch.json is missing or empty
		if (!config.type && !config.request && !config.name) {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document.languageId === 'markdown') {
				config.type = 'cmaketoolchains';
				config.name = 'Launch';
				config.request = 'launch';
				config.program = '${file}';
			}
		}

		if (!config.program) {
			return vscode.window.showInformationMessage("Cannot find a program to debug").then(_ => {
				return undefined;	// abort launch
			});
		}

		return config;
	}
}