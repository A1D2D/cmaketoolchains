import path from 'path';
import * as vscode from 'vscode';

interface Profile {
   name: string; // Profile name (e.g., Debug)
   buildType: string; // CMAKE_BUILD_TYPE value
   toolchain: string; // Toolchain name to use
   generator: string; // CMake generator (e.g. Ninja, Unix Makefiles)
   cmakeOptions?: string[]; // Extra CMake command line options
   buildDirectory?: string; // Build output directory path
   buildOptions?: string[]; // Flags for the build step (e.g. -j 14)
   environment?: { [key: string]: string }; // Additional environment variables for the build
}

interface Toolchain {
   name: string; // Name of the toolchain
   toolsetFolder: string; // Path to the toolset folder
   cmake: string; // Path to the CMake executable
   buildTool: string; // Path to the build tool executable
   ccompiler: string; // Path to the C compiler executable
   cppcompiler: string; // Path to the C++ compiler executable
   debugger?: string;
}

interface BuildTargets {
   name: string;
   artifacts: string[] | null;
}

interface RunDebugConfig {
   name: string;
   target: string;
   executeable: string;
   programArgs?: string;
   workDir?: string;
   envVars?: string;
   runAdmin: boolean;
   runExternal: boolean;
}

export let toolchains: Toolchain[] = [];

export let profiles: Profile[] = [];

export let runConfigs: RunDebugConfig[] = [];

export let buildPath: string | null = null;

export let projectPath: string | null = null;

export let avaliableTargets: BuildTargets[] | null = null;

export let context: vscode.ExtensionContext | null = null;

export function setToolchains(newToolchains: Toolchain[]) {
   toolchains = newToolchains; // Set new toolchains
}

export function setProfiles(newProfiles: Profile[]) {
   profiles = newProfiles; // Set new profiles
}

export function setRunConfigs(newRunConfigs: RunDebugConfig[]) {
   runConfigs = newRunConfigs;
}

export function setBuildPath(newBuildPath: string | null) {
   buildPath = newBuildPath;
}

export function setAvaliableTargets(newAvaliableTargets: BuildTargets[]) {
   avaliableTargets = newAvaliableTargets;
}

export function setContext(newContext: vscode.ExtensionContext) {
   context = newContext;
}

export function getToolchains() {
   return toolchains;
}

export function getProfiles() {
   return profiles;
}

export function getCurrentProfile() {
   return buildPath;
}

export function getAvaliableTargets() {
   return avaliableTargets;
}

export function initProjectFolder() {
   const workspaceFolders = vscode.workspace.workspaceFolders;
   if (!workspaceFolders) {
      vscode.window.showErrorMessage('No workspace folder open!');
      return;
   }

   projectPath = workspaceFolders[0].uri.fsPath;
}

export function resolvePath(p: string): string | null {
   if(!projectPath) {
      return null;
   }
   return path.isAbsolute(p) ? p : path.join(projectPath, p);
}

export { BuildTargets, RunDebugConfig };