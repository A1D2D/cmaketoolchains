import * as vscode from 'vscode';

import * as jsonc from 'jsonc-parser';
import * as path from 'path';
import * as fs from 'fs';
import * as ps from 'fs/promises';
import { getAvaliableTargets, profiles, toolchains } from '../globals';

interface ProjTempVar {
   name: string;
   type: string;
   options?: string[];
}

interface ProjectTemplate {
   name: string;
   variables: ProjTempVar[];
   path: string;
}

export function getTemplateName(templatePath: string): string | undefined {
   if (!templatePath) {
      return;
   }

   const templateJsonPath = path.join(templatePath, 'template.json');

   if (!fs.existsSync(templateJsonPath)) {
      return;
   }

   const raw = fs.readFileSync(templateJsonPath, 'utf8');
   const json: any = jsonc.parse(raw);

   if(!json) {
      return;
   }

   if(!json.name) {
      return;
   }

   if (!json.variables || !Array.isArray(json.variables)) {
      return;      
   }

   return json.name;
}


export function getTemplateFromPath(templatePath: string): ProjectTemplate | undefined {
   if (!templatePath) {
      vscode.window.showErrorMessage('Template path invalid.');
      return;
   }

   const templateJsonPath = path.join(templatePath, 'template.json');

   if (!fs.existsSync(templateJsonPath)) {
      vscode.window.showErrorMessage('Template json dose not exist.');
      return;
   }

   const raw = fs.readFileSync(templateJsonPath, 'utf8');
   const json: any = jsonc.parse(raw);

   if(!json) {
      vscode.window.showErrorMessage('Template json invalid.');
      return;
   }

   if(!json.name) {
      vscode.window.showErrorMessage('Template json invalid.');
      return;
   }

   if (!json.variables || !Array.isArray(json.variables)) {
      vscode.window.showErrorMessage('Template json invalid.');
      return;      
   }

   const template: ProjectTemplate = {
      name: json.name,
      variables: [],
      path: templatePath
   };

   for (const entry of json.variables) {
      if (!entry.name || !entry.type) {
         continue;
      }

      const variable: ProjTempVar = {
         name: entry.name,
         type: entry.type,
         options: entry.options
      };

      template.variables.push(variable);
   }

   return template;
}

export async function createTemplateAtDirectory(directory: string, template: ProjectTemplate, projectName: string): Promise<boolean> {
   const projectPath = path.join(
      directory,
      projectName
   );

   let replacements: Record<string, string> = {};

   let value;
   for (const variable of template.variables) {
      switch (variable.type) {
         case "select":
            value = await vscode.window.showQuickPick(
               variable.options || ["Default"],
               { placeHolder: `Select ${variable.name}` }
            );
            if(!value) {
               return false;
            }
            replacements[`{{{${variable.name}}}}`] = value;
            break;
         case "input":
            value = await vscode.window.showInputBox({
               title: `${variable.name}`,
               prompt: `Enter ${variable.name}`,
               value: variable.options?.at(0) || ''
            });
            if(!value) {
               return false;
            }
            replacements[`{{{${variable.name}}}}`] = value;
            break;
         case "project-name":
            replacements[`{{{${variable.name}}}}`] = projectName;
            break;

         case "profile":
            let profileNames: string[] = profiles.map(profile => profile.name).filter(Boolean);
            value = await vscode.window.showQuickPick(
               profileNames,
               { placeHolder: `Select Profile` }
            );
            if(!value) {
               return false;
            }
            replacements[`{{{${variable.name}}}}`] = value;
            break;

         case "toolchain":
            let toolchainNames: string[] = toolchains.map(toolchain => toolchain.name).filter(Boolean);
            value = await vscode.window.showQuickPick(
               toolchainNames,
               { placeHolder: `Select Toolchain` }
            );
            if(!value) {
               return false;
            }
            replacements[`{{{${variable.name}}}}`] = value;
            break;

         case "target":
            const targetNames = getAvaliableTargets()?.map(target => target.name) || [];
            value = await vscode.window.showQuickPick(
               targetNames,
               { placeHolder: `Select Target` }
            );
            if(!value) {
               return false;
            }
            replacements[`{{{${variable.name}}}}`] = value;
            break;
      
         default:
            break;
      }
   }

   const confirm = await vscode.window.showQuickPick(
      [
         "Create Project",
         "Cancel"
      ],
      {
         title: `Create ${projectName}?`,
         placeHolder: projectPath
      }
   );

   if (confirm !== "Create Project") {
      return false;
   }

   await ps.mkdir(projectPath, {
      recursive: true
   });

   copyTemplate(template.path, projectPath, replacements, ["template.json"]);
   return true;
}

export async function copyTemplate(source: string, destination: string, replacements: Record<string, string>, ignoredFiles: string[] = []) {
   await ps.mkdir(destination, { recursive: true });

   const entries = await ps.readdir(source, { withFileTypes: true });

   for (const entry of entries) {
      if (ignoredFiles.includes(entry.name)) {
         continue;
      }

      const src = path.join(source, entry.name);
      const dst = path.join(destination, entry.name);

      if (entry.isDirectory()) {
         await copyTemplate(src, dst, replacements, ignoredFiles);
         continue;
      }

      let text = await ps.readFile(src, "utf8");

      for (const [from, to] of Object.entries(replacements)) {
         text = text.replaceAll(from, to);
      }

      await ps.writeFile(dst, text, "utf8");
   }
}