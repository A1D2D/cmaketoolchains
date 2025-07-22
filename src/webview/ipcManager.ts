import { WebviewPanel } from "vscode";

export interface Message {
   command: string;
   data?: any;
}


export async function onDidReceiveMessage(panel: WebviewPanel, message: Message): Promise<void> {
   if(message.command === 'getProfiles') {
      panel.webview.postMessage({
         command: 'setProfiles',
         data: { 
            profiles: [
               {name: 'Debug', value: 'debug'},
               {name: 'Release', value: 'release'},
               {name: 'RelWithDebInfo', value: 'relWithDebInfo'},
            ]
         }
      });
   }
}  