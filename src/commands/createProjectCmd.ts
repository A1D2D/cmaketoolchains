import path from 'path';
import * as vscode from 'vscode';
import { createTemplateAtDirectory, getTemplateFromPath, getTemplateName } from '../cmakeTools/templateManager';

export function registerCreateProjectCommand(context: vscode.ExtensionContext) {
   const cmd = vscode.commands.registerCommand('cmaketoolchains.createProject', async () => {
      const config = vscode.workspace.getConfiguration('cmaketoolchains');
      const userTemplatePaths: string[] = config.get('templatePaths') || [""];

      const templatePaths = Array.from(userTemplatePaths);

      //ADD plugin spec temp
      const templatesPath = vscode.Uri.joinPath(
         context.extensionUri,
         "resources",
         "templates"
      );
      templatePaths.push(path.join(templatesPath.fsPath, "cpp-executeable"));
      

      const templateNames: string[] = [];
      let templateMap: Record<string, string> = {};
      templatePaths.forEach(templatePath => {
         const tempName = getTemplateName(templatePath);
         if(tempName) {
            templateNames.push(tempName);
            templateMap[tempName] = templatePath;
         }
      });
      templateNames.push('[Add new template]');

      const selectedTemplate = await vscode.window.showQuickPick(
         templateNames,
         { placeHolder: 'Create new Cmake..' }
      );

      if (!selectedTemplate) { return; }
      let templatePath: string = templateMap[selectedTemplate] || "";
      if (selectedTemplate === '[Add new template]') {
         const templatefolder = await vscode.window.showOpenDialog({
            title: "Select a template",
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false
         });
         if (!templatefolder || templatefolder.length === 0) {
            return;
         }
         templatePath = templatefolder[0].fsPath;

         userTemplatePaths.push(templatePath);
         await config.update('templatePaths', userTemplatePaths, vscode.ConfigurationTarget.Global);
      }

      
      const template = getTemplateFromPath(templatePath);
      if(!template) {
         return;
      }

      const projectName = await vscode.window.showInputBox({
         title: "Project Name",
         prompt: "Enter the project name",
         value: "MyProject",
         validateInput(value) {
            if (!value.trim()) {
               return "Project name cannot be empty";
            }

            if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
               return "Only letters, numbers, _ and - are allowed";
            }

            return undefined;
         }
      });

      if (!projectName) {
         return;
      }

      const folders = await vscode.window.showOpenDialog({
         title: "Select Project Location",
         canSelectFiles: false,
         canSelectFolders: true,
         canSelectMany: false
      });

      if (!folders || folders.length === 0) {
         return;
      }

      const projectPath = path.join(
         folders[0].fsPath,
         projectName
      );

      if(!await createTemplateAtDirectory(folders[0].fsPath, template, projectName)) {
         return;
      }

      // Step 6: Open project
      const open = await vscode.window.showQuickPick(
         [
            {
               label: "Open in New Window",
               value: true
            },
            {
               label: "Open in Current Window",
               value: false
            },
            {
               label: "Do Nothing",
               value: null
            }
         ],
         {
            title: "Project Created"
         }
      );


      if (open?.value !== null && open) {
         await vscode.commands.executeCommand(
            "vscode.openFolder",
            vscode.Uri.file(projectPath),
            open.value
         );
      }
   });

   context.subscriptions.push(cmd);
}