import * as vscode from 'vscode';
import { projectPath, RunDebugConfig } from '../globals';
import * as jsonc from 'jsonc-parser';
import * as fs from 'fs';
import * as path from 'path';

//PARSE
export function parseLaunchConfig(): RunDebugConfig[] {
   if (!projectPath) {
      vscode.window.showErrorMessage('Project path invalid.');
      return [];
   }

   const launchFilePath = path.join(projectPath, '.vscode', 'launch.json');
   if (!fs.existsSync(launchFilePath)) {
      return [];
   }

   const raw = fs.readFileSync(launchFilePath, 'utf8');
   const json: any = jsonc.parse(raw);
   const configurations = json?.configurations;
   if (!Array.isArray(configurations)) {
      return [];
   }

   const configs: RunDebugConfig[] = [];

   for (const entry of configurations) {
      if (entry?.type !== 'cmake-toolchains' || entry?.request !== 'launch') {
         continue;
      }
      if (!entry.name || !entry.target || !entry.executable) {
         continue;
      }

      const config: RunDebugConfig = {
         name: entry.name,
         target: entry.target,
         executable: entry.executable,
         programArgs: entry.programArgs ?? undefined,
         setupCommands: entry.setupCommands ?? { prettyPrinting: true },
         workDir: entry.workDir ?? undefined,
         environment: entry.environment ?? undefined,
         runAdmin: entry.runAdmin ?? false,
         runExternal: entry.runExternal ?? false,
      };

      configs.push(config);
   }

   return configs;
}

//WRITE
export async function saveLaunchConfigs(newConfigs: RunDebugConfig[]) {
   const folder = vscode.workspace.workspaceFolders?.[0];
   if (!folder) {
      vscode.window.showErrorMessage('Project path invalid.');
      return;
   }

   const launchJsonUri = vscode.Uri.joinPath(folder.uri, '.vscode', 'launch.json');
   
   try {
      await vscode.workspace.fs.stat(launchJsonUri);
   } catch {
      const vscodeFolder = vscode.Uri.joinPath(folder.uri, ".vscode");
      await vscode.workspace.fs.createDirectory(vscodeFolder);

      await vscode.workspace.fs.writeFile(
         launchJsonUri,
         new TextEncoder().encode(`{"version": "0.2.0","configurations": []}`)
      );
   }

   await replaceCMakeToolchainConfigs(launchJsonUri, newConfigs);
}

//IMPL
const TARGET_TYPE = 'cmake-toolchains';

function toLaunchConfig(config: RunDebugConfig): Record<string, unknown> {
   return {
      type: TARGET_TYPE,
      request: 'launch',
      name: config.name,
      target: config.target,
      executable: config.executable,
      programArgs: config.programArgs,
      setupCommands: config.setupCommands,
      workDir: config.workDir,
      environment: config.environment,
      runAdmin: config.runAdmin,
      runExternal: config.runExternal,
   };
}

function detectIndentation(text: string, document: vscode.TextDocument): { insertSpaces: boolean; tabSize: number } {
   const lines = text.split(/\r?\n/);
   for (const line of lines) {
      const match = /^(\t+| +)\S/.exec(line);
      if (match) {
         const indent = match[1];
         if (indent[0] === '\t') {
            return { insertSpaces: false, tabSize: 4 };
         }
         return { insertSpaces: true, tabSize: indent.length };
      }
   }

   const editor = vscode.window.visibleTextEditors.find(e => e.document === document);
   if (editor) {
      return {
         insertSpaces: editor.options.insertSpaces === true,
         tabSize: typeof editor.options.tabSize === 'number' ? editor.options.tabSize : 4,
      };
   }

   const config = vscode.workspace.getConfiguration('editor', document.uri);
   return {
      insertSpaces: config.get<boolean>('insertSpaces', true),
      tabSize: config.get<number>('tabSize', 4),
   };
}

function detectEol(document: vscode.TextDocument): string {
   return document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
}

function computeMinimalEdit(document: vscode.TextDocument, original: string, modified: string): vscode.TextEdit | undefined {
   if (original === modified) {
      return undefined;
   }

   let prefixLen = 0;
   const maxPrefix = Math.min(original.length, modified.length);
   while (prefixLen < maxPrefix && original[prefixLen] === modified[prefixLen]) {
      prefixLen++;
   }

   let suffixLen = 0;
   const maxSuffix = Math.min(original.length, modified.length) - prefixLen;
   while (
      suffixLen < maxSuffix &&
      original[original.length - 1 - suffixLen] === modified[modified.length - 1 - suffixLen]
   ) {
      suffixLen++;
   }

   const startOffset = prefixLen;
   const endOffset = original.length - suffixLen;
   const newText = modified.slice(prefixLen, modified.length - suffixLen);

   const range = new vscode.Range(
      document.positionAt(startOffset),
      document.positionAt(endOffset)
   );

   return vscode.TextEdit.replace(range, newText);
}

export function buildReplaceConfigsEdit(document: vscode.TextDocument, newConfigs: RunDebugConfig[]): vscode.WorkspaceEdit | undefined {
   const originalText = document.getText();

   const root = jsonc.parseTree(originalText);
   if (!root) {
      return undefined;
   }

   const configurationsNode = jsonc.findNodeAtLocation(root, ['configurations']);
   if (!configurationsNode || configurationsNode.type !== 'array' || !configurationsNode.children) {
      return undefined;
   }

   const matchIndices: number[] = [];
   configurationsNode.children.forEach((configNode, index) => {
      const typeNode = jsonc.findNodeAtLocation(configNode, ['type']);
      if (typeNode && typeNode.type === 'string' && typeNode.value === TARGET_TYPE) {
         matchIndices.push(index);
      }
   });

   const { insertSpaces, tabSize } = detectIndentation(originalText, document);
   const formattingOptions: jsonc.FormattingOptions = {
      tabSize,
      insertSpaces,
      eol: detectEol(document),
   };

   let workingText = originalText;

   const insertionIndex = matchIndices.length > 0 ? matchIndices[0] : configurationsNode.children.length;

   for (let i = matchIndices.length - 1; i >= 0; i--) {
      const edits = jsonc.modify(
         workingText,
         ['configurations', matchIndices[i]],
         undefined,
         { formattingOptions }
      );
      workingText = jsonc.applyEdits(workingText, edits);
   }

   newConfigs.forEach((config, offset) => {
      const edits = jsonc.modify(
         workingText,
         ['configurations', insertionIndex + offset],
         toLaunchConfig(config),
         { formattingOptions, isArrayInsertion: true }
      );
      workingText = jsonc.applyEdits(workingText, edits);
   });
   const minimalEdit = computeMinimalEdit(document, originalText, workingText);
   if (!minimalEdit) {
      return undefined;
   }

   const workspaceEdit = new vscode.WorkspaceEdit();
   workspaceEdit.replace(document.uri, minimalEdit.range, minimalEdit.newText);
   return workspaceEdit;
}

export async function replaceCMakeToolchainConfigs(launchJsonUri: vscode.Uri, newConfigs: RunDebugConfig[]): Promise<boolean> {
   const document = await vscode.workspace.openTextDocument(launchJsonUri);
   const edit = buildReplaceConfigsEdit(document, newConfigs);

   if (!edit) {
      return false;
   }

   const applied = await vscode.workspace.applyEdit(edit);
   if (applied) {
      await document.save();
   }
   return applied;
}