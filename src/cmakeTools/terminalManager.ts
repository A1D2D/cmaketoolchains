import * as vscode from "vscode";

class PseudoTerminal {
   public terminal: vscode.Terminal;
   private emitter = new vscode.EventEmitter<string>();

   private opened = false;
   private pendingMessages: string[] = [];

   constructor(name: string) {
      const pty: vscode.Pseudoterminal = {
         onDidWrite: this.emitter.event,

         open: () => {
            this.opened = true;

            this.clear();
            this.writeInfo(`${name} started`);

            // Flush messages that arrived before open()
            for (const msg of this.pendingMessages) {
               this.emitter.fire(msg);
            }

            this.pendingMessages = [];
         },

         close: () => {}
      };

      this.terminal = vscode.window.createTerminal({
         name,
         pty
      });
   }


   private send(text: string) {
      if (this.opened) {
         this.emitter.fire(text);
      } else {
         this.pendingMessages.push(text);
      }
   }


   public writeError(message: string) {
      this.write(`\x1b[1;31m[Error] ${message}\x1b[0m\r\n`);
   }

   public writeSuccess(message: string) {
      this.write(`\x1b[1;32m[Success] ${message}\x1b[0m\r\n`);
   }

   public writeInfo(message: string) {
      this.write(`\x1b[34m[Info] ${message}\x1b[0m\r\n`);
   }

   public writeWarrning(message: string) {
      this.write(`\x1b[1;33m[Warning] ${message}\x1b[0m\r\n`);
   }

   public write(text: string) {
      this.send(text.replace(/\n/g, "\r\n"));
   }

   public clear() {
      this.write("\x1b[2J\x1b[H");
   }

   public show(show: boolean) {
      this.terminal.show(show);
   }

   public dispose() {
      this.terminal.dispose();
      this.emitter.dispose();
      this.pendingMessages = [];
   }
}

export class PsudoTerminalManager {
   private buildTerminal?: PseudoTerminal;
   private syncTerminal?: PseudoTerminal;

   public init(context :vscode.ExtensionContext) {
      vscode.window.onDidCloseTerminal((terminal) => {
         if (terminal === this.buildTerminal?.terminal) {
            this.buildTerminal = undefined;
         }

         if (terminal === this.syncTerminal?.terminal) {
            this.syncTerminal = undefined;
         }
      });

      context.subscriptions.push({
         dispose: () => this.dispose()
      });
   }

   public getBuildTerminal(): PseudoTerminal {
      if (!this.buildTerminal) {
         this.buildTerminal = new PseudoTerminal("CMake Build");
      }

      return this.buildTerminal;
   }

   public getSyncTerminal(): PseudoTerminal {
      if (!this.syncTerminal) {
         this.syncTerminal = new PseudoTerminal("CMake Configure");
      }

      return this.syncTerminal;
   }

   public dispose() {
      this.buildTerminal?.dispose();
      this.syncTerminal?.dispose();
   } 
}