import {LoadScene} from "./treeViewUI";

// BOUND JSON
export async function loadBoundJson(handle,filename,defaultValue={}) {
    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const file = await fileHandle.getFile();
    const text = await file.text() || "{}";      
    let data = JSON.parse(text);
    data = { ...defaultValue, ...data };
    data.____handle = fileHandle; // bind handle

    data.save = async function() {saveBoundJson(this);}
    return data;
}

async function saveBoundJson(data) {
    try {
        //console.log("DATA:",data)
        const text = JSON.stringify(data, null, 2); 
        const fileHandle = data.____handle; 
        const writable = await fileHandle.createWritable();
        await writable.write(text);
        await writable.close();
        console.log(`Saved bound json`);
    } catch (err) {
        console.error(`Failed to save`, err);
    }   
}

async function loadLocalTextFile(handle,filename) {
  try {
    console.log("LOADING text file",handle,filename);
    const fileHandle = await handle.getFileHandle(filename, { create: false });    
    const file = await fileHandle.getFile();
    const text = await file.text();
    return text
  } catch {
    console.log(`Failed to load local text file: ${filename}`);
    return ""
  }
}

async function saveLocalTextFile(handle,filename,text) {
    try {
        const fileHandle = await handle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(text);
        await writable.close();
    } catch (err) {
        console.error('Failed to save prompt.txt', err);
    }
}

async function loadLocalJsonFile(handle,filename) {
    try {  
        text = await loadLocalTextFile(handle,filename);
        return  JSON.parse(text);
    } catch {
        return null;
    }
}

async function saveLocalJsonFile(handle,filename,json) {
    try {
        const text = JSON.stringify(json, null, 2); 
        await saveLocalTextFile(handle,filename,text);
    } catch (err) {
        console.error('Failed to save json file', err);
    }       
}

export async function clipboardToJson() {
  try {
        window.updateStatus('Importing json from clipboard...');
        const text = await navigator.clipboard.readText();    
        json = JSON.parse(text);
        return json;
    }
    catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
    return null;
}

async function importShotsFromClipboard() {
    try {
        shot_dict = await clipboardToJson();
        for (const key in shot_dict) {
        if (shot_dict.hasOwnProperty(key)) {
            importSceneDict(key, shot_dict[key]);
            }
        }
    }
    catch (err) {
        console.error('Failed to read clipboard contents: ', err);
    }
}

async function importSceneDict(scene_name, scene_dict){
  window.updateStatus(`Importing scene: ${scene_name}`);
  sceneFolderHandle = await window.scenesDirHandle.getDirectoryHandle(scene_name, { create: true } );

  for (const key in scene_dict) {
    if (scene_dict.hasOwnProperty(key)) {          
        importShotDict(key, scene_dict[key],sceneFolderHandle);
      }
  }
}

async function importShotDict(shot_name,shot_dict,sceneFolderHandle) {
  window.updateStatus(`Importing shot: ${shot_name} `);    
  //console.log('Importing shot:', shot_dict);
  shotFolderHandle = await sceneFolderHandle.getDirectoryHandle(shot_name, { create: true } );

    try {
        const fileHandle = await shotFolderHandle.getFileHandle('prompt.txt', { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(shot_dict.prompt);
        await writable.close();
    } catch (err) {
    console.error('Failed to save prompt.txt', err);
    }
}

// Splits Script into scenes and shots
export async function importScenesFromScript() {
    function splitScenes(text) {
    return text
        .split(/(?=^SC_\S{1,64}\s*$)/m)
        .filter(s => /^SC_\S{1,64}/m.test(s))
        .map(s => {
            const idMatch = s.match(/^SC_\S{1,64}/m);
            return {
                name: idMatch ? idMatch[0] : null,
                content: s.replace(/^SC_\S{1,64}\s*/m, "").trim()
            };
        });
    }

    try {
        console.log("IMPORTING SCENES");
        const script_text = await loadLocalTextFile(window.rootDirHandle,'script.txt');
        const scenes = splitScenes(script_text);
        for (let new_scene of scenes) {           
            const scene = window.scenes.find(s => s.name === new_scene.name);
            if (scene) {
                console.log("Found:", scene.name);
                scene.sceneinfo.script = new_scene.content;
                scene.sceneinfo.save()
            } else {
                console.log("Not found");
                const sceneFolderHandle = await window.scenesDirHandle.getDirectoryHandle(new_scene.name, { create: true } );            
                const _scene = await LoadScene(new_scene.name,sceneFolderHandle);
                _scene.sceneinfo.script = new_scene.content;
                _scene.sceneinfo.save()
            }
            
        }
    }
    catch (err) {
        console.error('Failed to read script.txt: ', err);
    }
}

async function getRelativePath(fileHandle, dirHandle, path = '') {
    for await (const [name, handle] of dirHandle.entries()) {
        if (handle === fileHandle) return path + name;
        if (handle.kind === 'directory') {
            const result = await getRelativePath(fileHandle, handle, path + name + '/');
            if (result) return result;
        }
    }
    return null;
}


export async function downloadURL(url, directoryHandle) {
    try {
        console.log("DOWNLOADING:",url)
        const urlObj = new URL(url);
        const fileName = urlObj.pathname.split('/').pop();

        // Check if the file already exists
        try {
            await directoryHandle.getFileHandle(fileName);
            console.log("File already exists:", fileName);
            return;
        } catch (e) {
            // File does not exist, proceed to create
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        const blob = await response.blob();

        const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        //console.log(`Saved file: ${fileName}`);
    } catch (err) {
        //console.error(`Error saving file from ${url}:`, err);
        throw err;
    }
}


export async function copyDirectory(parentHandle, oldName, newName) {
  // Get the original directory
  const oldDir = await parentHandle.getDirectoryHandle(oldName);

  // Create the new directory
  const newDir = await parentHandle.getDirectoryHandle(newName, { create: true });

  // Move all entries
  for await (const [name, entry] of oldDir.entries()) {
    if (entry.kind === "file") {
      const file = await entry.getFile();
      const writable = await newDir.getFileHandle(name, { create: true });
      const stream = await writable.createWritable();
      await stream.write(await file.arrayBuffer());
      await stream.close();
    } else if (entry.kind === "directory") {
      await copyDirectory(oldDir, name, name);          // recursive copy
      await newDir.resolve(await oldDir.getDirectoryHandle(name)); // move recursively
    }
  }
}


// File2Base64
export async function fileToBase64(fileHandle) {
  const file = await fileHandle.getFile();
  const arrayBuffer = await file.arrayBuffer();

  // Convert bytes → Base64
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  const base64 = btoa(binary);
  return {
    dataUrl: `data:${file.type};base64,${base64}`,
    rawBase64: base64
  };
}