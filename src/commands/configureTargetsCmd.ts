import * as vscode from 'vscode';
import { runConfigs, context, RunDebugConfig, setRunConfigs } from '../globals';
import { WebviewPanel, window, ViewColumn } from 'vscode';
import path from 'path';
import fs from 'fs';
import { parseLaunchConfig, saveLaunchConfigs } from '../cmakeTools/launchConfigManager';


interface TargetPageState {
   targets: RunDebugConfig[];
   sS: any
}

let pageState: TargetPageState = {
   targets: [],
   sS: {}
};


export function registerConfigureTargetsCommand(context: vscode.ExtensionContext) {
   setRunConfigs(parseLaunchConfig());
   pageState.targets = runConfigs;

   const cmd = vscode.commands.registerCommand('cmaketoolchains.configureTargets', async () => {
      openTargetManagerPanel("Configure Targets");
   });
   context.subscriptions.push(cmd);
}

function openPanel(panelId: string, name: string | undefined, htmlPath: string) {// : WebviewPanel
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

function openTargetManagerPanel(name?: string): void {
   openPanel('targetManager', name, 'targetConfig.html');
}

interface Message {
   command: string;
   data?: any;
}

async function messageHandler(message: Message, panel: WebviewPanel): Promise<void> {
   const config = vscode.workspace.getConfiguration('cmaketoolchains');
   switch (message.command) {
      case 'clientSync':
         pageState = message.data;
         break;
      case 'clientSyncRequest':
         sync(panel);
         break;
      case 'save':
         console.log('save requested');
         setRunConfigs(pageState.targets);
         saveLaunchConfigs(runConfigs);
         break;
      case 'reload':
         console.log('reload requested');
         setRunConfigs(parseLaunchConfig());
         pageState.targets = runConfigs;
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