import * as vscode from 'vscode';
import { avaliableTargets, buildToolEnv, BuildToolEnv, Profile, profiles, runConfigs, RunDebugConfig, setProfiles, setRunConfigs, setToolchains, Toolchain, toolchains, RunInstance, getRunInstances } from '../globals';
import * as path from 'path';
import * as cp from 'child_process';

import { buildSetupCommands } from './utilities';
import { parseLaunchConfig } from './launchConfigManager';

export async function runSelectedTarget(selectedTarget: string) {
   const target = avaliableTargets?.find(t => t.name === selectedTarget);
   if (!target || !target.artifacts || target.artifacts.length === 0) {
      vscode.window.showErrorMessage('Target or artifact not found.');
      return;
   }

   const config = vscode.workspace.getConfiguration('cmaketoolchains');
   setProfiles(config.get('cmakeProfiles') || []);

   const cmakeSelectedProfile = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedProfile');
   const profile = profiles.find(p => p.name === cmakeSelectedProfile);
   if (!profile) {
      throw new Error("Selected profile not found.");
   }

   setToolchains(config.get('cmakeToolchains') || []);
   const toolchain = toolchains.find(tc => tc.name === profile.toolchain);

   if (!toolchain) {
      throw new Error("Toolchain not found set by the current selected cmake profile.");
   }

   const exePath = target.artifacts[0];

   setRunConfigs(parseLaunchConfig());

   const defaults: RunDebugConfig = {
      name: `${path.basename(exePath)}`,
      target: `${selectedTarget}`,
      executable: `${selectedTarget}`,
      programArgs: [],
      setupCommands: { prettyPrinting: true },
      workDir: `${path.dirname(exePath)}`,
      runAdmin: false,
      runExternal: false
   };

   const targetConfig: RunDebugConfig = runConfigs.find(cfg => cfg.executable === selectedTarget) || defaults;

   const sConfig: RunDebugConfig = {
      name: targetConfig.name || defaults.name,
      target: targetConfig.target || defaults.target,
      executable: targetConfig.executable || defaults.executable,
      programArgs: targetConfig.programArgs || defaults.programArgs,
      setupCommands: targetConfig.setupCommands || defaults.setupCommands,
      workDir: targetConfig.workDir || defaults.workDir,
      runAdmin: targetConfig.runAdmin || defaults.runAdmin,
      runExternal: targetConfig.runExternal || defaults.runExternal,
   };

   if (sConfig.runExternal) {
      runInExternalConsole(exePath, sConfig, profile, toolchain);
   } else {
      runInVsCode(exePath, sConfig, profile, toolchain);
   }
}

export async function debugSelectedTarget(selectedTarget: string) {
   const target = avaliableTargets?.find(t => t.name === selectedTarget);
   if (!target || !target.artifacts || target.artifacts.length === 0) {
      vscode.window.showErrorMessage('Target or artifact not found.');
      return;
   }

   const config = vscode.workspace.getConfiguration('cmaketoolchains');
   setProfiles(config.get('cmakeProfiles') || []);

   const cmakeSelectedProfile = vscode.workspace.getConfiguration().get('cmaketoolchains.cmakeSelectedProfile');
   const profile = profiles.find(p => p.name === cmakeSelectedProfile);
   if (!profile) {
      throw new Error("Selected profile not found.");
   }

   setToolchains(config.get('cmakeToolchains') || []);
   const toolchain = toolchains.find(tc => tc.name === profile.toolchain);

   if (!toolchain) {
      throw new Error("Toolchain not found set by the current selected cmake profile.");
   }

   const exePath = target.artifacts[0];

   setRunConfigs(parseLaunchConfig());

   const defaults: RunDebugConfig = {
      name: `${path.basename(exePath)}`,
      target: `${selectedTarget}`,
      executable: `${selectedTarget}`,
      programArgs: [],
      setupCommands: { prettyPrinting: true },
      workDir: `${path.dirname(exePath)}`,
      runAdmin: false,
      runExternal: false
   };

   const targetConfig: RunDebugConfig = runConfigs.find(cfg => cfg.executable === selectedTarget) || defaults;

   const sConfig: RunDebugConfig = {
      name: targetConfig.name || defaults.name,
      target: targetConfig.target || defaults.target,
      executable: targetConfig.executable || defaults.executable,
      programArgs: targetConfig.programArgs || defaults.programArgs,
      setupCommands: targetConfig.setupCommands || defaults.setupCommands,
      workDir: targetConfig.workDir || defaults.workDir,
      runAdmin: targetConfig.runAdmin || defaults.runAdmin,
      runExternal: targetConfig.runExternal || defaults.runExternal,
   };

   debugSomewhere(exePath, sConfig, profile, toolchain, buildToolEnv || { compilerId: '', compilerPath: '' });
}

function runInExternalConsole(exePath: string, config: RunDebugConfig, profile: Profile, toolchain: Toolchain) {
   if (process.platform !== 'win32') {
      runInVsCode(exePath, config, profile, toolchain);
      vscode.window.showWarningMessage("External CMD launch only works on Windows.");
      return;
   }

   if (config.runAdmin) {
      vscode.window.showWarningMessage("Please run VSCode as an administrator. The 'runAdmin' flag is not supported and should be ignored if VSCode is already running with elevated privileges.");
   }

   const args = config.programArgs?.join(' ') || '';
   const fullCommand = `"${exePath}" ${args}`;
   const workDir = config.workDir || path.dirname(exePath);

   cp.exec(`cmd.exe /c start cmd.exe /k ${fullCommand}`, {
      cwd: config.workDir,
      env: {
         ...process.env,
         ...(profile.environment || {}),
         ...(config.environment || {}),
         PATH: `${toolchain.toolsetFolder}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`
      },
   }).unref();
}

function getInstance(name: string): RunInstance {
   let instances = getRunInstances().get(name);

   if (!instances) {
      instances = [];
      getRunInstances().set(name, instances);
   }

   let instance = instances.find(x => !x.running);

   if (!instance) {
      instance = {
         id: instances.length + 1,
         running: false
      };

      instances.push(instance);
   }

   instance.running = true;

   return instance;
}

export async function onTaskEnded(e: vscode.TaskProcessEndEvent) {
   for (const instances of getRunInstances().values()) {
      for (const instance of instances) {
         if (instance.execution === e.execution) {
            instance.running = false;
            instance.execution = undefined;
            return;
         }
      }
   }
}

function getDisplayName(name: string, id: number) {
   return id === 1 ? name : `${name} #${id}`;
}

async function runInVsCode(exePath: string, config: RunDebugConfig, profile: Profile, toolchain: Toolchain) {
   if (config.runAdmin) {
      vscode.window.showWarningMessage(
         "Please run VSCode as an administrator. The 'runAdmin' flag is not supported and should be ignored if VSCode is already running with elevated privileges."
      );
   }

   const instance = getInstance(config.name);

   const task = new vscode.Task(
      {
         type: "cmaketoolchains-run",
         instanceId: `id-${config.name}-${instance.id}`
      },
      vscode.TaskScope.Workspace,
      `Run ${getDisplayName(config.name, instance.id)}`,
      "cmaketoolchains"
   );

   task.execution = new vscode.ProcessExecution(
      exePath,
      config.programArgs || [],
      {
         cwd: config.workDir,
         env: {
            ...process.env,
            ...(profile.environment || {}),
            ...(config.environment || {}),
            PATH: `${toolchain.toolsetFolder}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`
         }
      }
   );

   task.presentationOptions = {
      clear: true,
      panel: vscode.TaskPanelKind.Shared
   };

   const execution = await vscode.tasks.executeTask(task);

   instance.running = true;
   instance.execution = execution;
}

async function debugSomewhere(exePath: string, config: RunDebugConfig, profile: Profile, toolchain: Toolchain, buildToolEnv: BuildToolEnv) {
   if (config.runAdmin) {
      vscode.window.showWarningMessage("Please run VSCode as an administrator. The 'runAdmin' flag is not supported and should be ignored if VSCode is already running with elevated privileges.");
   }

   const mergedEnv = {
      ...process.env,
      ...(profile.environment || {}),
      ...(config.environment || {}),
      PATH: `${toolchain.toolsetFolder}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH}`
   };

   const environmentArray = Object.entries(mergedEnv).map(([name, value]) => ({
      name, value: String(value)
   }));

   const isMSVC = buildToolEnv?.compilerId === "MSVC";
   const isGdb = !isMSVC && process.platform === "win32";

   const dbgConfig: vscode.DebugConfiguration = {
      name: `Debug ${config.name}`,
      type: isMSVC ? "cppvsdbg" : "cppdbg",
      request: 'launch',
      program: exePath,
      args: config.programArgs?.join(' '),
      cwd: config.workDir,
      stopAtEntry: false,
      console: 'externalTerminal',
      runInExternalConsole: config.runExternal,
      MIMode: isMSVC ? "cppvsdbg" : (isGdb ? "gdb" : "lldb"),
      environment: environmentArray,
      setupCommands: buildSetupCommands(config.setupCommands, isGdb)
   };

   const folder = vscode.workspace.workspaceFolders?.[0];
   const success = await vscode.debug.startDebugging(folder, dbgConfig);
   if (success) {
      setTimeout(() => {
         vscode.window.activeTerminal?.show(true);
      }, 1000);
   } else {
      vscode.window.showErrorMessage('Failed to start debugger');
   }
}