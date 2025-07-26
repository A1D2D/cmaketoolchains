import * as vscode from 'vscode';
// import { openToolchainManagerPanel } from '../webview/panels';
import { Toolchain, context, setToolchains, toolchains } from '../globals';
import { WebviewPanel, window, ViewColumn} from 'vscode';
import path from 'path';
import fs from 'fs';

interface ToolchainPageState {
   toolchains: Toolchain[]
   sS: any
}

let pageState: ToolchainPageState = {
   toolchains: [],
   sS: {}
};

export function registerConfigureToolchainsCommand(context: vscode.ExtensionContext) {
   const config = vscode.workspace.getConfiguration('cmaketoolchains');
   setToolchains(config.get('cmakeToolchains') || []);
   pageState.toolchains = toolchains;

   const cmd = vscode.commands.registerCommand('cmaketoolchains.configureToolchains', async () => {
      vscode.window.showInformationMessage('Configure Toolchains: in progress');
      openToolchainManagerPanel("Configure Toolchains");
   });
   context.subscriptions.push(cmd);
}

function openPanel(panelId: string, name: string | undefined, htmlPath: string): WebviewPanel {
   const panel: WebviewPanel = window.createWebviewPanel(panelId, name || panelId, ViewColumn.One, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [vscode.Uri.file(path.join(context!.extensionPath, 'html'))]
   });

   const filePath = path.join(context!.extensionPath, 'html', htmlPath);
   let html: string = fs.readFileSync(filePath, 'utf8');
   const webUri = panel.webview.asWebviewUri(vscode.Uri.file(path.join(context!.extensionPath, 'html')));
   html = html.replace(/{{root}}/g, webUri.toString());

   panel.webview.html = html;
   sync(panel);
   panel.webview.onDidReceiveMessage((message) => {
      messageHandler(message, panel);
   }, undefined, context!.subscriptions);

   return panel;
}

function openToolchainManagerPanel(name?: string): void {
   openPanel('toolchainManager', name, 'toolchainConfig.html');
}

interface Message {
   command: string;
   data?: any;
}

async function messageHandler(message: Message, panel: WebviewPanel): Promise<void> {
   switch (message.command) {
      case 'clientSync':
         pageState = message.data;
         break;
      case 'clientSyncRequest':
         sync(panel);
         break;
      case 'save':
         console.log('save requested');
         break;
      case 'reload':
         console.log('reload requested');
         const config = vscode.workspace.getConfiguration('cmaketoolchains');
         setToolchains(config.get('cmakeToolchains') || []);
         pageState.toolchains = toolchains;
         sync(panel);
         break;
      case 'selectFolder':
         const folderUris = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Select Folder'
         });

         if (folderUris && folderUris.length > 0) {
               panel.webview.postMessage({
               command: 'folderSelected',
               data: {
                  targetInputId: message.data,
                  path: folderUris[0].fsPath
               }
            });
         }
         break;
      case 'selectFile':
         const filerUris = await vscode.window.showOpenDialog({
            canSelectFolders: false,
            canSelectFiles: true,
            canSelectMany: false,
            openLabel: 'Select Tool'
         });

         if (filerUris && filerUris.length > 0) {
               panel.webview.postMessage({
               command: 'fileSelected',
               data: {
                  targetInputId: message.data,
                  path: filerUris[0].fsPath
               }
            });
         }
         break;
      case 'test':
         console.log('˘--test--˘');
         console.log(message.data);
         vscode.window.showInformationMessage('test');
      default:
         break;
   }
}

async function syncRequest(panel: WebviewPanel) {
   panel.webview.postMessage({
      command: 'serverSyncRequest'
   });
}

async function sync(panel: WebviewPanel) {
   panel.webview.postMessage({
      command: 'serverSync',
      data: pageState
   });
}