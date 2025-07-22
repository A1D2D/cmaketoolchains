let toolchains;
const listEl = document.getElementById("toolchain-list");

function render() {
   listEl.innerHTML = "";
   toolchains.forEach((tc, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = tc.name || `Toolchain ${i}`;
      listEl.appendChild(opt);
   });
   updateForm();
}

function updateForm() {
   const formFields = [
      'name', 'toolsetFolder', 'cmake',
      'buildTool', 'ccompiler', 'cppcompiler', 'debugger'
   ];
   const toolchain = toolchains[listEl.selectedIndex];
   formFields.forEach(id => {
      document.getElementById(id).value = toolchain ? (toolchain[id] || '') : '';
   });
}

function updateToolchainFromForm() {
   if (listEl.selectedIndex < 0) {
      return;
   }
   const formFields = [
      'name', 'toolsetFolder', 'cmake',
      'buildTool', 'ccompiler', 'cppcompiler', 'debugger'
   ];
   const toolchain = toolchains[listEl.selectedIndex];
   formFields.forEach(id => {
      toolchain[id] = document.getElementById(id).value;
   });
}

window.addEventListener('message', event => {
   /**
    * Handle messages from the extension host.
    * @type {{ command: string, data: {profiles?: any[], toolchains?: Toolchain[] } }}
    */
   const message = event.data;

   switch (message.command) {
      case 'setToolchains':
         toolchains = message.toolchains;
         render();
         break;
      case 'setProfiles':
         document.getElementById('log').textContent = `Profiles updated: ${JSON.stringify(message)}`;
         break;
   }
});

document.getElementById('add').onclick = () => {
   toolchains.push({ name: '', toolsetFolder: '', cmake: '', buildTool: '', ccompiler: '', 'c++compiler': '', debugger: '' });
   render();
};

document.getElementById('remove').onclick = () => {
   const index = listEl.selectedIndex;
   if (index >= 0) {
      toolchains.splice(index, 1);
   }
   render();
};

document.getElementById('save').onclick = () => {
   updateToolchainFromForm();
   updateForm();
   render();
   vscode.postMessage({ command: 'saveToolchains', toolchains });
};

document.getElementById("toolchain-list").onclick = e => {
   updateForm();
};

document.getElementById('action').onclick = e => {
   vscode.postMessage({ command: 'action' });
};

vscode.postMessage({ command: 'getProfiles' });
