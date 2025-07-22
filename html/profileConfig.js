let profiles;
const listEl = document.getElementById("profile-list");

function render() {
   listEl.innerHTML = "";
   profiles.forEach((tc, i) => {
      const opt = document.createElement("option");
      opt.value = i;
      opt.textContent = tc.name || `Profile ${i}`;
      listEl.appendChild(opt);
   });
   updateForm();
}

function updateForm() {
   const formFields = [
      'name', 'buildType', 'toolchain', 'generator', 'buildDirectory'
   ];
   const profile = profiles[listEl.selectedIndex];
   formFields.forEach(id => {
      document.getElementById(id).value = profile ? (profile[id] || '') : '';
   });
}

function updateProfileFromForm() {
   if (listEl.selectedIndex < 0) return;
      const formFields = [
      'name', 'buildType', 'toolchain', 'generator', 'buildDirectory'
   ];

   const profile = profiles[listEl.selectedIndex];
   formFields.forEach(id => {
      profile[id] = document.getElementById(id).value;
   });
}

window.addEventListener('message', event => {
   const message = event.data;

   switch (message.command) {
      case 'setProfiles':
         profiles = message.profiles;
         render();
         break;
   }
});

document.getElementById('add').onclick = () => {
   profiles.push({ name: `Cmake Profile`});
   render();
};

document.getElementById('remove').onclick = () => {
   const index = listEl.selectedIndex;
   if (index >= 0) {
      profiles.splice(index, 1);
   }
   render();
};

document.getElementById('save').onclick = () => {
   updateProfileFromForm();
   updateForm();
   render();
   vscode.postMessage({ command: 'saveProfiles', profiles });
};

document.getElementById("profile-list").onclick = e => {
   updateForm();
}

document.getElementById('action').onclick = e => {
   vscode.postMessage({ command: 'action' });
};

vscode.postMessage({ command: 'dataRequest' });
