
import path from 'path';
import vscode, { WebviewPanel, window, ViewColumn } from 'vscode';
import fs from 'fs';

import { context } from '../globals';

import { onDidReceiveMessage } from './ipcManager';

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

   panel.webview.onDidReceiveMessage((message) => {
      onDidReceiveMessage(panel, message);
   }, undefined, context!.subscriptions);

   return panel;
}

export function openToolchainManagerPanel(name?: string): void {
   openPanel('toolchainManager', name, 'toolchainConfig.html');
}
