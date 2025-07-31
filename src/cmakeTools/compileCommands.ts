import * as vscode from 'vscode';
import * as path from 'path';

interface CompileCommandsTarget {
   extension: string;
   configSection: string;
   configKey: string;
   enabled: boolean;
}

const DEFAULT_TARGETS: CompileCommandsTarget[] = [
   {
      extension: 'ms-vscode.cpptools',
      configSection: 'C_Cpp',
      configKey: 'default.compileCommands',
      enabled: true
   },
   {
      extension: 'llvm-vs-code-extensions.vscode-clangd',
      configSection: 'clangd',
      configKey: 'arguments',
      enabled: false // Will append --compile-commands-dir argument
   },
   {
      extension: 'ccls-project.ccls',
      configSection: 'ccls',
      configKey: 'cache.directory',
      enabled: false
   }
];

export class CompileCommandsManager {
   private context: vscode.ExtensionContext;

   constructor(context: vscode.ExtensionContext) {
      this.context = context;
   }

   private getConfiguredTargets(): CompileCommandsTarget[] {
      const config = vscode.workspace.getConfiguration('cmaketoolchains');
      const customTargets = config.get<CompileCommandsTarget[]>('compileCommandTargets');

      if (customTargets && customTargets.length > 0) {
         return customTargets;
      }

      return DEFAULT_TARGETS.filter(target => target.enabled);
   }

   private isExtensionAvailable(extensionId: string): boolean {
      const extension = vscode.extensions.getExtension(extensionId);
      return extension !== undefined;
   }

   private async updateClangdConfig(buildDir: string): Promise<void> {
      const config = vscode.workspace.getConfiguration('clangd');
      const currentArgs = config.get<string[]>('arguments') || [];

      // Remove any existing compile-commands-dir arguments
      const filteredArgs = currentArgs.filter(arg =>
         !arg.startsWith('--compile-commands-dir=')
      );

      // Add the new compile-commands-dir argument
      const compileCommandsDir = path.dirname(path.join(buildDir, 'compile_commands.json'));
      filteredArgs.push(`--compile-commands-dir=${compileCommandsDir}`);

      await config.update('arguments', filteredArgs, vscode.ConfigurationTarget.Workspace);
   }

   private async updateGenericTarget(target: CompileCommandsTarget, buildDir: string): Promise<void> {
      const config = vscode.workspace.getConfiguration(target.configSection);
      const compileCommandsPath = path.join(buildDir, 'compile_commands.json');

      await config.update(target.configKey, compileCommandsPath, vscode.ConfigurationTarget.Workspace);
   }

   public async updateCompileCommands(buildDir: string): Promise<void> {
      const targets = this.getConfiguredTargets();
      const results: { target: string; success: boolean; error?: string }[] = [];

      for (const target of targets) {
         try {
            // Check if extension is available (optional check)
            if (!this.isExtensionAvailable(target.extension)) {
               console.log(`Extension ${target.extension} not found, skipping...`);
               continue;
            }

            // Special handling for clangd
            if (target.extension === 'llvm-vs-code-extensions.vscode-clangd') {
               await this.updateClangdConfig(buildDir);
            } else {
               await this.updateGenericTarget(target, buildDir);
            }

            results.push({ target: target.extension, success: true });
            console.log(`Updated compile commands for ${target.extension}`);

         } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            results.push({ target: target.extension, success: false, error: errorMsg });
            console.error(`Failed to update compile commands for ${target.extension}:`, errorMsg);
         }
      }

      // Show summary notification
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful > 0) {
         vscode.window.showInformationMessage(
            `Compile commands updated for ${successful} extension(s)${failed > 0 ? `, ${failed} failed` : ''}`
         );
      }

      if (failed > 0 && successful === 0) {
         vscode.window.showErrorMessage('Failed to update compile commands for all configured extensions');
      }
   }

   public getConfigurationStatus(): { extension: string; configured: boolean; available: boolean }[] {
      const targets = this.getConfiguredTargets();

      return targets.map(target => ({
         extension: target.extension,
         configured: target.enabled,
         available: this.isExtensionAvailable(target.extension)
      }));
   }
}

export async function updateCompileCommandsEx(buildDir: string) {
   const config = vscode.workspace.getConfiguration('C_Cpp');
   await config.update('default.compileCommands', path.join(buildDir, 'compile_commands.json'), vscode.ConfigurationTarget.Workspace);
   return;
}