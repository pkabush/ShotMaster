let rootDirHandle = null;
let selectedDirHandle = null;
window.treeViewContainer = document.getElementById('folders');
const contentsPanel = document.getElementById('contents');
const statusBar = document.getElementById('status-bar');

// -- BUTTON CALLBACKS ---
// --- Pick folder button ---
document.getElementById('pick').addEventListener('click', async () => {
  try {
    rootDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await window.db.savePickedFolder(rootDirHandle);
    await listFolders();
    contentsPanel.innerHTML = '';
  } catch (err) {
    console.error('Folder pick canceled or failed', err);
  }
});

// --- Import From Scenes from Clipboard ---
/*
document.getElementById('import_shots_from_clipboard_btn').addEventListener('click', async () => {
    await importShotsFromClipboard();  
});
*/

// --- ADD SCENE ---
document.getElementById('add_scene_btn').addEventListener('click', async () => {
  const scene_name = prompt("SCENE NAME:", "SC_0010");
  if (scene_name) { 
    const sceneFolderHandle = await window.scenesDirHandle.getDirectoryHandle(scene_name, { create: true } );            
    const scene = await LoadScene(scene_name,sceneFolderHandle);
    window.treeViewContainer.addScene(scene);
  }
});

document.getElementById('import_scenes_from_script_btn').addEventListener('click', async () => {
    await importScenesFromScript();  
});



// --- Page Loaded ---
window.addEventListener('DOMContentLoaded', async () => {
  // Load User settings
  window.userdata = await window.db.loadUserData()

  const handle = await window.db.loadPickedFolder();
  if (handle) {
    let permission = await handle.queryPermission({ mode: 'readwrite' });
    if (permission !== 'granted') {
      permission = await handle.requestPermission({ mode: 'readwrite' });
    }
    if (permission === 'granted') {
      rootDirHandle = handle;
      await listFolders();
    }
  }
});

const recentMenu = document.getElementById('recent-folders-menu');
// Load recent folders from IndexedDB and populate submenu
async function populateRecentFolders() {
  const recent = await window.db.loadRecentFolders();
  recentMenu.innerHTML = ''; 
  
  recent.forEach((handle, index) => {
    const li = document.createElement('li');
    li.textContent = handle.name;
    li.addEventListener('click', async () => {
      // Request permission and open folder
      let permission = await handle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        permission = await handle.requestPermission({ mode: 'readwrite' });
      }
      if (permission === 'granted') {
        rootDirHandle = handle;
        await listFolders();
        contentsPanel.innerHTML = '';
      }
    });
    recentMenu.appendChild(li);
  });
}
// Populate on hover
document.getElementById('open-recent').addEventListener('mouseenter', populateRecentFolders);



// --- open Settings ---
document.getElementById('settings_btn').addEventListener('click', async () => {
  contentsPanel.innerHTML = '';

  const container = document.createElement('div');
  await createEditableKeyField(window.userdata,"KIE_API_KEY",container)
  await createEditableKeyField(window.userdata,"GPT_API_KEY",container)
  //https://openrouter.ai/
  await createEditableKeyField(window.userdata,"openrouter_API_KEY",container)

    // Buttons container
  buttonContainer = CreateButtonsContainer(container);  

  logProjInfoBtn = addSimpleButton('log-proj-info-btn', 'LOG ProjInfo',buttonContainer);
  logProjInfoBtn.addEventListener('click', async () => { 
        console.log("PROJECT INFO:",window.projinfo);
        console.log("USERDATA:",window.userdata);
    });

  downloadAhkFile = addSimpleButton('download-ahk-file', 'Download AHK',buttonContainer);
  downloadAhkFile.addEventListener('click', async () => { 
      const link = document.createElement('a');
      link.href = 'assets/MJ_SplitPaste.exe';
      link.download = 'MJ_SplitPaste.exe';    // Optional: sets default file name
      document.body.appendChild(link); // Append temporarily
      link.click();                    // Trigger download
      document.body.removeChild(link); // Clean up
  });

  // Download CMD Server
  addSimpleButton('download-server-file', 'Download CMD_Server',buttonContainer, async () => { 
    // This Gets Blocked by safe browsing
    //await downloadURL(window.location.href + 'assets/cmd_server.exe', rootDirHandle);

    // This works
    const link = document.createElement('a');
    link.href = 'assets/cmd_server.exe';
    link.download = 'cmd_server.exe';    // Optional: sets default file name
    document.body.appendChild(link); // Append temporarily
    link.click();                    // Trigger download
    document.body.removeChild(link); // Clean up
  });

  await editableJsonField(window.projinfo, "split_shot_prompt", container);
  await editableJsonField(window.projinfo, "describe_prompt", container);
  await editableJsonField(window.projinfo, "describe_env_prompt", container);  

  createDropdown("GPT MODEL:",[
    "gpt-4o-mini",
    "gpt-5.1",
    "gpt-5-mini",
    "gpt-5-nano",
    "gpt-5",
  ], container, (e) => {
    console.log("Picked model",e);
    window.projinfo.gpt_model = e;
    window.projinfo.save();
  }).setValue(window.projinfo.gpt_model);

  contentsPanel.appendChild(container);
});

// --- open Artbook ---
document.getElementById('artbook_btn').addEventListener('click', async () => {
  contentsPanel.innerHTML = '';
  await artbookUI.createArtbookPanel(contentsPanel);  
});


// TREE VIEW CONTAINER
window.treeViewContainer.addScene = async function(scene){
    const sceneLi = await scene.getTreeItem();
    this.appendChild(sceneLi);
    sortChildrenById(this);
}
window.treeViewContainer.reset = async function(){
    this.innerHTML = ''; 
    for (const scene of window.scenes) { this.addScene(scene); }   
}