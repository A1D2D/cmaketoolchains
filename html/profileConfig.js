/**
 * @typedef {Object} Profile
 * @property {string} name
 * @property {string} buildType
 * @property {string} toolchain
 * @property {string} generator
 * @property {string[]} [cmakeOptions]
 * @property {string} [buildDirectory]
 * @property {string[]} [buildOptions]
 * @property {{ [key: string]: string }} [environment]
 */

/**
 * @typedef {Object} SubState
 * @property {int} selectedIndex
 */

/**
 * state/all data contained in the page
 * @type {{ 
 * profiles: Profile[],
 * sS: SubState
 * }}
 */
let state = {
   profiles: [],
   sS: { selectedIndex: -1 }
};

const profileList = document.getElementById("profile-list");
const form = document.getElementById("profile-form");

syncRequest();

window.addEventListener('message', event => {
   /**
    * Handle messages from the extension host.
    * @type {{ command: string, data: any }}
    */
   const message = event.data;
   const profile = state.profiles[profileList.selectedIndex];

   switch (message.command) {
      case 'serverSyncRequest':
         sync();
         break;
      case 'serverSync':
         if (message.data) {
            state = message.data;
            refreshProfileList();
            updateSelectedForm();
         }
         break;
      case 'folderSelected':
         document.getElementById(message.data.targetInputId).value = message.data.path;
         syncFormToProfile();
         sync();
         break;
      case 'fileSelected':
         document.getElementById(message.data.targetInputId).value = message.data.path;
         syncFormToProfile();
         sync();
         break;
   }
});

/*topnav*/
document.getElementById("add").addEventListener("click", () => {
   let newProfile = getFormData();
   if (profileList.selectedIndex >= 0 && profileList.selectedIndex <= state.profiles.length) {
      newProfile = {};
   }

   state.profiles.push(newProfile);
   profileList.selectedIndex = state.profiles.length - 1;
   refreshProfileList();
   updateSelectedForm();
});

document.getElementById("remove").addEventListener("click", () => {
   const i = profileList.selectedIndex;
   if (i >= 0) {
      state.profiles.splice(i, 1);
      profileList.selectedIndex = i;
      refreshProfileList();
      updateSelectedForm();
   }
});

document.getElementById("duplicate").addEventListener("click", () => {
   const i = profileList.selectedIndex;
   if (i >= 0) {
      const clone = JSON.parse(JSON.stringify(state.profiles[i]));
      state.profiles.splice(i + 1, 0, clone);
      profileList.selectedIndex = i + 1;
      refreshProfileList();
      updateSelectedForm();
   }
});

document.getElementById("up").addEventListener("click", () => {
   const i = profileList.selectedIndex;
   if (i > 0) {
      [state.profiles[i], state.profiles[i - 1]] = [state.profiles[i - 1], state.profiles[i]];
      profileList.selectedIndex = i - 1;
      refreshProfileList();
      updateSelectedForm();
   }
});

document.getElementById("down").addEventListener("click", () => {
   const i = profileList.selectedIndex;
   if (i >= 0 && i < state.profiles.length - 1) {
      [state.profiles[i], state.profiles[i + 1]] = [state.profiles[i + 1], state.profiles[i]];
      profileList.selectedIndex = i + 1;
      refreshProfileList();
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
profileList.addEventListener("change", () => {
   const i = profileList.selectedIndex;
   state.sS.selectedIndex = i;
   if (i >= 0) {
      setFormData(state.profiles[i]);
   }
});
/*~sidebar*/

/*main*/
/**
 * @returns {Profile}
 */
function getFormData() {//TODO: convertToProfile
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
      buildType: form.buildType.value,
      toolchain: form.toolchain.value,
      generator: form.generator.value,
      buildDirectory: form.buildDirectory.value,

      cmakeOptions: getArrayFromTextarea("cmakeOptions"),
      buildOptions: getArrayFromTextarea("buildOptions"),
      environment: envObject
   };
}

/**
 * @param {Profile} pf
 *///TODO: convertToProfile
function setFormData(pf) {
   document.getElementById('name').value = pf.name || '';
   form.buildType.value = pf.buildType || "";
   form.toolchain.value = pf.toolchain || "";
   form.generator.value = pf.generator || "";
   form.buildDirectory.value = pf.buildDirectory || "";

   setArrayToTextarea("cmakeOptions", pf.cmakeOptions || []);
   setArrayToTextarea("buildOptions", pf.buildOptions || []);
   const envArray = [];
   if (pf.environment && typeof pf.environment === 'object') {
      for (const [key, value] of Object.entries(pf.environment)) {
         envArray.push(`${key}=${value}`);
      }
   }
   setArrayToTextarea("environment", envArray);
}
/*~main*/

/*Inputs*/
function syncFormToProfile() {
   const index = state.sS.selectedIndex;
   if (index < 0 || index >= state.profiles.length) {return;}

   const pf = state.profiles[index];
   pf.name = form.querySelector("#name").value;
   pf.buildType = form.querySelector("#buildType").value;
   pf.toolchain = form.querySelector("#toolchain").value;
   pf.generator = form.querySelector("#generator").value;
   pf.buildDirectory = form.querySelector("#buildDirectory").value;

   pf.cmakeOptions = form.querySelector("#cmakeOptions").value
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

   pf.buildOptions = form.querySelector("#buildOptions").value
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean);

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
   pf.environment = envObject;

   refreshProfileList();
   sync();
}

const debouncedSync = debounce(syncFormToProfile, 300);

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
   vscode.postMessage({ command: 'clientSync', data: state });
}

function syncRequest() {
   vscode.postMessage({ command: 'clientSyncRequest' });
}
/*~Send Command*/


function refreshProfileList() {
   const i = profileList.selectedIndex;
   profileList.innerHTML = "";
   state.profiles.forEach((tc, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = tc.name || `Profile ${index + 1}`;
      profileList.appendChild(option);
   });
   profileList.selectedIndex = i;
   state.sS.selectedIndex = i;

   sync();
}

function updateSelectedForm() {
   const i = profileList.selectedIndex;
   if (i >= 0 && i <= state.profiles.length) {
      setFormData(state.profiles[profileList.selectedIndex]);
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