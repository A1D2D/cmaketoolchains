/**
 * @typedef {Object} RawGdbCommand
 * @property {string} text
 * @property {string} [description]
 * @property {boolean} [ignoreFailures]
 */

/**
 * @typedef {Object} DebugSetupCommand
 * @property {boolean} [prettyPrinting]
 * @property {boolean} [disableASLR]
 * @property {RawGdbCommand[]} [rawCommands]
 */

/**
 * @typedef {Object} RunDebugConfig
 * @property {string} name
 * @property {string} target
 * @property {string} executable
 * @property {string[]} [programArgs]
 * @property {DebugSetupCommand} [setupCommands]
 * @property {string} [workDir]
 * @property {{ [key: string]: string }} [environment]
 * @property {boolean} [runAdmin]
 * @property {boolean} [runExternal]
 */

/**
 * @typedef {Object} SubState
 * @property {int} selectedIndex
 */

/**
 * state/all data contained in the page
 * @type {{ 
 * targets: RunDebugConfig[],
 * sS: SubState
 * }}
 */
let tstate = {
   targets: [],
   sS: { selectedIndex: -1 }
};

const targetList = document.getElementById("target-list");
const form = document.getElementById("target-form");
const commandList = document.querySelector(".command-list");

document.getElementById("add-command").addEventListener("click", () => {
   addCommandRow();
});

syncRequest();

window.addEventListener('message', event => {
   /**
    * Handle messages from the extension host.
    * @type {{ command: string, data: any }}
    */
   const message = event.data;
   const target = tstate.targets[targetList.selectedIndex];

   switch (message.command) {
      case 'serverSyncRequest':
         sync();
         break;
      case 'serverSync':
         if (message.data) {
            tstate = message.data;
            refreshTargetList();
            updateSelectedForm();
         }
         break;
      case 'folderSelected':
         document.getElementById(message.data.targetInputId).value = message.data.path;
         syncFormToTarget();
         sync();
         break;
      case 'fileSelected':
         document.getElementById(message.data.targetInputId).value = message.data.path;
         syncFormToTarget();
         sync();
         break;
   }
});

/*topnav*/
document.getElementById("add").addEventListener("click", () => {
   let newTarget = getFormData();
   if (targetList.selectedIndex >= 0 && targetList.selectedIndex <= tstate.targets.length) {
      newTarget = {};
   }

   tstate.targets.push(newTarget);
   targetList.selectedIndex = tstate.targets.length - 1;
   refreshTargetList();
   updateSelectedForm();
});

document.getElementById("remove").addEventListener("click", () => {
   const i = targetList.selectedIndex;
   if (i >= 0) {
      tstate.targets.splice(i, 1);
      targetList.selectedIndex = i;
      refreshTargetList();
      updateSelectedForm();
   }
});

document.getElementById("duplicate").addEventListener("click", () => {
   const i = targetList.selectedIndex;
   if (i >= 0) {
      const clone = JSON.parse(JSON.stringify(tstate.targets[i]));
      tstate.targets.splice(i + 1, 0, clone);
      targetList.selectedIndex = i + 1;
      refreshTargetList();
      updateSelectedForm();
   }
});

document.getElementById("up").addEventListener("click", () => {
   const i = targetList.selectedIndex;
   if (i > 0) {
      [tstate.targets[i], tstate.targets[i - 1]] = [tstate.targets[i - 1], tstate.targets[i]];
      targetList.selectedIndex = i - 1;
      refreshTargetList();
      updateSelectedForm();
   }
});

document.getElementById("down").addEventListener("click", () => {
   const i = targetList.selectedIndex;
   if (i >= 0 && i < tstate.targets.length - 1) {
      [tstate.targets[i], tstate.targets[i + 1]] = [tstate.targets[i + 1], tstate.targets[i]];
      targetList.selectedIndex = i + 1;
      refreshTargetList();
      updateSelectedForm();
   }
});
/*~topnav*/

/*bottomnav*/
document.getElementById("save").addEventListener("click", () => {
   vscode.postMessage({ command: 'save' });
});

document.getElementById("reload").addEventListener("click", () => {
   vscode.postMessage({ command: 'reload' });
});
/*~bottomnav*/

/*sidebar*/
targetList.addEventListener("change", () => {
   const i = targetList.selectedIndex;
   tstate.sS.selectedIndex = i;
   if (i >= 0) {
      setFormData(tstate.targets[i]);
   }
});
/*~sidebar*/

/*main*/
/**
 * 
 * @returns {RunDebugConfig}
 */
function getFormData() {
   const envLines = form.querySelector("#environment").value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);
   const envObject = {};
   for (const line of envLines) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length > 0) {
         envObject[key.trim()] = rest.join('=').trim();
      }
   }

   return {
      name: form.name.value,
      target: form.target.value,
      executable: form.executable.value,
      programArgs: getArrayFromTextarea("programArgs"),
      setupCommands: readDebugSetupCommands(),
      workDir: form.workDir.value,
      environment: envObject,
      runAdmin: form.runAdmin.checked,
      runExternal: form.runExternal.checked
   };
}

/**
 * @param {RunDebugConfig} cf
 */
function setFormData(cf) {
   const envArray = [];
   if (cf.environment && typeof cf.environment === 'object') {
      for (const [key, value] of Object.entries(cf.environment)) {
         envArray.push(`${key}=${value}`);
      }
   }

   form.name.value = cf.name || '';
   form.target.value = cf.target || "";
   form.executable.value = cf.executable || "";
   setArrayToTextarea("programArgs", cf.programArgs || []);
   writeDebugSetupCommands(cf.setupCommands || {});
   form.workDir.value = cf.workDir || "";
   setArrayToTextarea("environment", envArray);
   form.runAdmin.checked = cf.runAdmin;
   form.runExternal.checked = cf.runExternal;

}
/*~main*/

/*Inputs*/
function syncFormToTarget() {
   const index = tstate.sS.selectedIndex;
   if (index < 0 || index >= tstate.targets.length) { return; }

   const cf = tstate.targets[index];
   cf.name = form.querySelector("#name").value;
   cf.target = form.querySelector("#target").value;
   cf.executable = form.querySelector("#executable").value;

   cf.programArgs = form.querySelector("#programArgs").value
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

   cf.setupCommands = readDebugSetupCommands();
   cf.workDir = form.querySelector("#workDir").value;

   const envLines = form.querySelector("#environment").value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

   const envObject = {};
   for (const line of envLines) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length > 0) {
         envObject[key.trim()] = rest.join('=').trim();
      }
   }
   cf.environment = envObject;
   cf.runAdmin = form.querySelector("#runAdmin").checked;
   cf.runExternal = form.querySelector("#runExternal").checked;

   refreshTargetList();
   sync();
}

const debouncedSync = debounce(syncFormToTarget, 300);

form.addEventListener("input", debouncedSync);
form.addEventListener("change", debouncedSync);

function getArrayFromTextarea(id) {
   return document.getElementById(id).value.split('\n').filter(Boolean);
}

function setArrayToTextarea(id, arr) {
   document.getElementById(id).value = (arr || []).join('\n');
}
/*~Inputs*/

/*Send Command*/
function sync() {
   vscode.postMessage({ command: 'clientSync', data: tstate });
}

function syncRequest() {
   vscode.postMessage({ command: 'clientSyncRequest' });
}
/*~Send Command*/

function refreshTargetList() {
   const i = targetList.selectedIndex;
   targetList.innerHTML = "";
   tstate.targets.forEach((tg, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = tg.name || `Target ${index + 1}`;
      targetList.appendChild(option);
   });
   targetList.selectedIndex = i;
   tstate.sS.selectedIndex = i;

   sync();
}

function updateSelectedForm() {
   const i = targetList.selectedIndex;
   if (i >= 0 && i <= tstate.targets.length) {
      setFormData(tstate.targets[targetList.selectedIndex]);
   } else {
      form.reset();
   }
}

function test(params) {
   vscode.postMessage({ command: 'test', data: params });
}

function debounce(func, delay = 300) {
   let timeout;
   return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
   };
}

let currentTargetInputId = null;

function openFolderPicker(inputId) {
   currentTargetInputId = inputId;
   vscode.postMessage({ command: 'selectFolder', data: currentTargetInputId });
}

function openFilePicker(inputId) {
   currentTargetInputId = inputId;
   vscode.postMessage({ command: 'selectFile', data: currentTargetInputId });
}

/*DebugCommand*/
/**
 * @param {RawGdbCommand} [command]
 */
function addCommandRow(command = {}) {
   const row = document.createElement("div");
   row.className = "command-row";

   row.innerHTML = `
      <input
         type="text"
         class="command-text"
         placeholder="Enter command..."
         value="${command.text ?? ""}"
      />

      <label class="ignore-checkbox">
         <input
               type="checkbox"
               class="ignore-failures"
               ${command.ignoreFailures ? "checked" : ""}
         >
         <span>Ignore Fail</span>
      </label>

      <button class="delete">🗑</button>
   `;

   row.querySelector(".delete").addEventListener("click", () => {
      row.remove();
   });

   commandList.appendChild(row);
}

function readDebugSetupCommands() {
   return {
      prettyPrinting: document.querySelector(".pretty-printing-checkbox input").checked,

      disableASLR: document.querySelector(".disable-aslr-checkbox input").checked,

      rawCommands: [...document.querySelectorAll(".command-row")].map(row => ({
         text: row.querySelector(".command-text").value,
         ignoreFailures: row.querySelector(".ignore-failures").checked
      })).filter(cmd => cmd.text.trim() !== "")
   };
}

/**
 * @param {DebugSetupCommand} data
 */
function writeDebugSetupCommands(data) {
   document.querySelector(".pretty-printing-checkbox input").checked = !!data.prettyPrinting;

   document.querySelector(".disable-aslr-checkbox input").checked = !!data.disableASLR;

   commandList.innerHTML = "";

   if (Array.isArray(data.rawCommands)) {
      data.rawCommands.forEach(addCommandRow);
   }
}
/*~DebugCommand*/