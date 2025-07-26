/**
 * @typedef {Object} Toolchain
 * @property {string} name
 * @property {string} toolsetFolder
 * @property {string} cmake
 * @property {string} buildTool
 * @property {string} ccompiler
 * @property {string} cppcompiler
 * @property {string} debugger
 */

/**
 * @typedef {Object} SubState
 * @property {int} selectedIndex
 */

/**
 * state/all data contained in the page
 * @type {{ 
 * toolchains: Toolchain[],
 * sS: SubState
 * }}
 */
let state = {
   toolchains: [],
   sS: { selectedIndex: -1 }
};

const toolchainList = document.getElementById("toolchain-list");
const form = document.getElementById("toolchain-form");

syncRequest();

window.addEventListener('message', event => {
   /**
    * Handle messages from the extension host.
    * @type {{ command: string, data: any }}
    */
   const message = event.data;
   const toolchain = state.toolchains[toolchainList.selectedIndex];

   switch (message.command) {
      case 'serverSyncRequest':
         sync();
         break;
      case 'serverSync':
         if (message.data) {
            state = message.data;
            refreshToolchainList();
            updateSelectedForm();
         }
         break;
      case 'folderSelected':
         document.getElementById(message.data.targetInputId).value = message.data.path;
         syncFormToToolchain();
         sync();
         break;
      case 'fileSelected':
         document.getElementById(message.data.targetInputId).value = message.data.path;
         syncFormToToolchain();
         sync();
         break;
   }
});

/*topnav*/
document.getElementById("add").addEventListener("click", () => {
   let newToolchain = getFormData();
   if (toolchainList.selectedIndex >= 0 && toolchainList.selectedIndex <= state.toolchains.length) {
      newToolchain = {};
   }

   state.toolchains.push(newToolchain);
   toolchainList.selectedIndex = state.toolchains.length - 1;
   refreshToolchainList();
   updateSelectedForm();
});

document.getElementById("remove").addEventListener("click", () => {
   const i = toolchainList.selectedIndex;
   if (i >= 0) {
      state.toolchains.splice(i, 1);
      toolchainList.selectedIndex = i;
      refreshToolchainList();
      updateSelectedForm();
   }
});

document.getElementById("duplicate").addEventListener("click", () => {
   const i = toolchainList.selectedIndex;
   if (i >= 0) {
      const clone = JSON.parse(JSON.stringify(state.toolchains[i]));
      state.toolchains.splice(i + 1, 0, clone);
      toolchainList.selectedIndex = i + 1;
      refreshToolchainList();
      updateSelectedForm();
   }
});

document.getElementById("up").addEventListener("click", () => {
   const i = toolchainList.selectedIndex;
   if (i > 0) {
      [state.toolchains[i], state.toolchains[i - 1]] = [state.toolchains[i - 1], state.toolchains[i]];
      toolchainList.selectedIndex = i - 1;
      refreshToolchainList();
      updateSelectedForm();
   }
});

document.getElementById("down").addEventListener("click", () => {
   const i = toolchainList.selectedIndex;
   if (i >= 0 && i < state.toolchains.length - 1) {
      [state.toolchains[i], state.toolchains[i + 1]] = [state.toolchains[i + 1], state.toolchains[i]];
      toolchainList.selectedIndex = i + 1;
      refreshToolchainList();
      updateSelectedForm();
   }
});
/*~topnav*/

/*bottomnav*/
document.getElementById("save").addEventListener("click", () => {
   vscode.postMessage({ command: 'save'});
});

document.getElementById("reload").addEventListener("click", () => {
   vscode.postMessage({ command: 'reload'});
});
/*~bottomnav*/

/*sidebar*/
toolchainList.addEventListener("change", () => {
   const i = toolchainList.selectedIndex;
   state.sS.selectedIndex = i;
   if (i >= 0) {
      setFormData(state.toolchains[i]);
   }
});
/*~sidebar*/

/*main*/
/**
 * 
 * @returns {Toolchain}
 */
function getFormData() {
   return {
      name: form.name.value,
      toolsetFolder: form.toolsetFolder.value,
      cmake: form.cmakePath.value,
      buildTool: form.buildToolPath.value,
      ccompiler: form.cCompilerPath.value,
      cppcompiler: form.cppCompilerPath.value,
      debugger: form.debuggerPath.value
   };
}

/**
 * @param {Toolchain} tc
 */
function setFormData(tc) {
   document.getElementById('name').value = tc.name || '';
   form.toolsetFolder.value = tc.toolsetFolder || "";
   form.cmakePath.value = tc.cmake || "";
   form.buildToolPath.value = tc.buildTool || "";
   form.cCompilerPath.value = tc.ccompiler || "";
   form.cppCompilerPath.value = tc.cppcompiler || "";
   form.debuggerPath.value = tc.debugger || "";
}
/*~main*/

/*Inputs*/
function syncFormToToolchain() {
   const index = state.sS.selectedIndex;
   if (index < 0 || index >= state.toolchains.length) {
      return;
   }

   const tc = state.toolchains[index];
   tc.name = form.querySelector("#name").value;
   tc.toolsetFolder = form.querySelector("#toolsetFolder").value;
   tc.cmake = form.querySelector("#cmakePath").value;
   tc.buildTool = form.querySelector("#buildToolPath").value;
   tc.ccompiler = form.querySelector("#cCompilerPath").value;
   tc.cppcompiler = form.querySelector("#cppCompilerPath").value;
   tc.debugger = form.querySelector("#debuggerPath").value;

   refreshToolchainList();
   sync();
}

const debouncedSync = debounce(syncFormToToolchain, 300);

form.addEventListener("input", debouncedSync);
form.addEventListener("change", debouncedSync);
/*~Inputs*/

/*Send Command*/
function sync() {
   vscode.postMessage({ command: 'clientSync', data: state });
}

function syncRequest() {
   vscode.postMessage({ command: 'clientSyncRequest' });
}
/*~Send Command*/


function refreshToolchainList() {
   const i = toolchainList.selectedIndex;
   toolchainList.innerHTML = "";
   state.toolchains.forEach((tc, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = tc.name || `Toolchain ${index + 1}`;
      toolchainList.appendChild(option);
   });
   toolchainList.selectedIndex = i;
   state.sS.selectedIndex = i;

   sync();
}

function updateSelectedForm() {
   const i = toolchainList.selectedIndex;
   if (i >= 0 && i <= state.toolchains.length) {
      setFormData(state.toolchains[toolchainList.selectedIndex]);
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