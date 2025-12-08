import {loadBoundJson} from "./fileSystemUtils.js";
import {CreateTask} from "./Tasks.js";
import {readArtbookData} from "./artbook.js";
import {selectSceneFolder} from "./folderUI.js";


async function LoadShot(shotName, shotHandle,scene){
  const default_shotinfo = {
    finished: false 
  }
  let shotinfo = await loadBoundJson(shotHandle, 'shotinfo.json',default_shotinfo);  
  let taskinfo = await loadBoundJson(shotHandle, 'tasks.json',{tasks:[]});  

  const shot = { 
        name: shotName,
        handle: shotHandle, 
        shotinfo: shotinfo,
        taskinfo:taskinfo,
        scene:scene,
        // Functions
        async saveShotInfo() {
            await saveBoundJson(this.shotinfo);
        },
        async saveTaskInfo() {
            await saveBoundJson(this.taskinfo);
        },
        async addKieTask(_task) {     
          const task = CreateTask(this).fromTask(_task);
          this.taskinfo.tasks.push(task);
          this.taskinfo.save();
          task.checkResults();
          return task;          
        },
        initializeTasks() {
          const shot = this;  
          const _tasks = []
          for(const task of this.taskinfo.tasks) {
            _tasks.push({...CreateTask(shot),...task});
          }
          this.taskinfo.tasks = _tasks;
        }, 
        async getSrcImageHandle() {
          try{
              if (this.shotinfo.srcImage == null) return null;
              const resultsDir = await this.handle.getDirectoryHandle("results", { create: false });
              const fileHandle = await resultsDir.getFileHandle(this.shotinfo.srcImage, { create: false });
              return fileHandle;
          }
          catch (err){
            
          }
          return null
        },
        async updateEvent(action = null) {    
          await this.onUpdateEvent();      
          // Dispatch Shot Update
          const shotUpdateEvent = new CustomEvent("shotupdate", { detail: { shot: this ,action } });
          document.dispatchEvent(shotUpdateEvent);
        },
        async addUpdateCallback(onUpdate){
          // EVENT LISTENERS
          console.log("ADDED SHOT UPDATE LISTENER",onUpdate);
          document.addEventListener("shotupdate", (e) => {
              if (e.detail.shot == this){
                onUpdate(e.detail);
              }
          });
        }, 
        async onDelete(callback){          
          /*
          document.addEventListener("shotupdate", (e) => {
              if (e.detail.shot == this && e.detail.action == "delete"){
                callback(e.detail.shot);
              }
          });*/
          const listener = (e) => {
            if (e.detail.shot === this && e.detail.action === "delete") {
              callback(e.detail.shot);
            }
          };
          document.addEventListener("shotupdate", listener);
          return listener;
        },
        // Shot self check update
        async onUpdateEvent() {
          // Check if we have first image
          if (!this.shotinfo.srcImage){
            try {
              dirHandle = await this.handle.getDirectoryHandle("results", { create: false });
              for await (const [name, fileHandle] of dirHandle.entries()) {
                if (fileHandle.kind !== "file") continue;
                if (/\.(png|jpe?g|gif|webp)$/i.test(name)) {
                  this.shotinfo.srcImage = name;
                  await shot.saveShotInfo();
                  return;
                }
              }
            } catch (err) {
              // no folder/images
            }
          }
          // Do other things
        },
        async deleteFromDisk(){
          try {
              // 1. Remove from scene's shots array
              const index = this.scene.shots.indexOf(this);
              if (index > -1) {this.scene.shots.splice(index, 1);}

              // 2. Delete the shot folder from disk
              if (this.handle) {
                await this.scene.handle.removeEntry(this.name, { recursive: true });
              }
              
              // 3. Optionally notify UI about scene update
              //const shotDeletedEvent = new CustomEvent("shotdeleted", { detail: { shot: this } });
              //document.dispatchEvent(shotDeletedEvent);
              //this.updateEvent("delete");
              document.dispatchEvent(new CustomEvent("shot_remove", { detail: { shot:this } }));


              //this.scene.call("onCreateShot")
              //console.log(`Shot "${this.name}" deleted successfully.`);

          } catch (err) {
              console.error(`Failed to delete shot "${this.name}":`, err);
          }
        },
        async renameShot(name){
          console.log("RENAME ",this, " to name ", name);
          await copyDirectory(this.scene.handle,this.name,name);

          const newShot = await LoadShot(name,shotHandle,this.scene)      
          document.dispatchEvent(new CustomEvent("shot_create", { detail: { shot:newShot } }));
          
          // Push Shot At correct index
          let index = this.scene.shots.findIndex(shot => shot.name.localeCompare(name) > 0);
          if (index === -1) index = this.scene.shots.length; // If no greater name found, append at end
          this.scene.shots.splice(index, 0, newShot);

          await this.deleteFromDisk()          
        },
        async setStatus(status) {
            if (status != this.shotinfo.finished){
                this.shotinfo.finished  = status;
                // Not realy cute, might fix later
                this.scene.ui_treeitem.update();
                this.shotinfo.save();                
            }
        }


        // SHOT DICT END
    }   

  shot.initializeTasks();
  return shot;
}

async function LoadScene(sceneName, sceneHandle){
  const default_sceneinfo = {
    finished: false,
    description: "",
    location: "",
    shotsjson: "",
    script:"",
    tags: [],
    // UI
    ui_treeitem:null,
    ui_scenepanel:null
  }          

  let sceneinfo = await loadBoundJson(sceneHandle, 'sceneinfo.json',default_sceneinfo);

  const scene = {
    name: sceneName ,
    handle: sceneHandle, 
    shots: [],    
    sceneinfo:sceneinfo,
    // Functions
    async LoadShots() {
      this.shots = []
      for await (const [shotName, shotHandle] of this.handle.entries()) {
        if (shotHandle.kind === 'directory') {
          this.shots.push(await LoadShot(shotName,shotHandle,this));
        }
      } 
    },
    // Add Tag
    async addTag(img) {
      if (!this?.sceneinfo?.tags?.includes(img.path)) { this.sceneinfo.tags.push(img.path); }
      console.log("Scene",this);
      this.sceneinfo.save();
    },
    // Remove Tag
    async removeTag(img) {
    if (!this?.sceneinfo?.tags) return;

    const index = this.sceneinfo.tags.indexOf(img.path);
    if (index !== -1) {
        this.sceneinfo.tags.splice(index, 1); // remove the tag
        console.log("Removed tag:", img.path, "Scene:", this);
        this.sceneinfo.save();
      }
    },
    // Get All Tags
    async getTags(){
      const tags = []
      for(const tag_path of this.sceneinfo.tags) {      
        tags.push(await artbookUI.path2img(tag_path));
      }
      return tags
    },
    // Get Tags decription
    async getTagsString(){
      const tags_dict = {};
      for (const tag of await scene.getTags()) {
        if (tag == null) continue;
        const categoryName = tag.category.name;     
        const subCategoryName = tag.subCategory.name; 
        const prompt = tag.data?.prompt || "";

        if (!tags_dict[categoryName]) { tags_dict[categoryName] = {};}
        tags_dict[categoryName][subCategoryName] =  prompt
      }
      return JSON.stringify(tags_dict,null, 2);
    },
    async createShot(name,data = null){
      console.log('Generating shot:', name);
      console.log('Shot data:',data);
      // Create Directory
      const shotHandle = await this.handle.getDirectoryHandle(name, { create: true } );
      // Load Shot
      const newShot = await LoadShot(name,shotHandle,this)      
      //this.shots.push(newShot)

      // Push Shot At correct index
      let index = this.shots.findIndex(shot => shot.name.localeCompare(name) > 0);
      if (index === -1) index = this.shots.length; // If no greater name found, append at end
      this.shots.splice(index, 0, newShot);

      // Set Its shot info
      if (data) {
        newShot.shotinfo =  { ...newShot.shotinfo,...data };      
        await newShot.shotinfo.save()
      }
      //this.call("onCreateShot",{shot : newShot});
      document.dispatchEvent(new CustomEvent("shot_create", { detail: { shot:newShot } }));
    },
    getFinishedShotCount() {
        return this.shots.filter(s => s.shotinfo.finished).length;
    },
    getTotalShotCount() {
        return this.shots.length;
    },    
    // Delete
    async delete() {
      if (confirm(`Are you sure you want to delete scene ${this.name}?`)) {
        const index = window.scenes.indexOf(this);
        if (index > -1) {window.scenes.splice(index, 1);}
        
        if (this.handle) { await window.scenesDirHandle.removeEntry(this.name, { recursive: true }); }
        this?.ui_treeitem?.remove?.();
      } 
    },


    // UI FUNCTIONS
    // Create Tree Item
    async getTreeItem() { 
        if (this.ui_treeitem) return this.ui_treeitem;

        // ---- Build scene <li> ----
        this.ui_treeitem = document.createElement('li');
        this.ui_treeitem.id = `treeview-scene-${scene.name}`
        this.ui_treeitem.classList.add('scene-li');
        // Header container (scene name + counter)
        const headerDiv = document.createElement('div');
        headerDiv.classList.add('scene-header');
        this.ui_treeitem.appendChild(headerDiv);    
        // Name
        const sceneNameSpan = document.createElement('span');
        sceneNameSpan.textContent = scene.name;
        headerDiv.appendChild(sceneNameSpan);
        // Shot Counter
        const counterSpan = document.createElement('span');
        counterSpan.classList.add('scene-counter');
        headerDiv.appendChild(counterSpan);
        // On Click
        headerDiv.addEventListener('click', () => { selectSceneFolder(scene); });

        // Update UI Function
        this.ui_treeitem.update = function(){
            counterSpan.textContent = `${scene.getFinishedShotCount()}/${scene.getTotalShotCount()}`;
        }
        this.ui_treeitem.update();
        return this.ui_treeitem;
      }, 

    // SCENE DICT END
  }

  await scene.LoadShots()
  return scene
}

async function updateTreeDict() {
  window.scenes = [];
  window.scenesDirHandle = await window.rootDirHandle.getDirectoryHandle("Scenes", { create: true } );
  
  for await (const [sceneName, sceneHandle] of window.scenesDirHandle.entries()) {
    if (sceneHandle.kind === 'directory') {
      let scene = await LoadScene(sceneName, sceneHandle);
      window.scenes.push( scene );
    }
  }
  //console.log('Updated treeDict:', window.scenes);
}


async function createShotLI(shot) {
    // ---- Build shot <li> ----
    const shotLi = document.createElement('li');
    shotLi.textContent = shot.name;
    shotLi.style.cursor = 'pointer';
    shotLi.style.display = 'flex';
    shotLi.style.alignItems = 'center';
    shotLi.style.justifyContent = 'space-between';

    const statusIcon = document.createElement('span');
    statusIcon.style.marginLeft = '4px';
    shotLi.appendChild(statusIcon);

    shotLi.addEventListener('click', (e) => {
        e.stopPropagation();
        selectShot(shot);
    });    

    shot.liElement = shotLi;

    shot.updateUI = function(){
        const isCompleted = shot.shotinfo.finished;
        statusIcon.textContent = isCompleted ? '●' : '○';
        statusIcon.style.color = isCompleted ? 'green' : 'grey';

        shot.scene.updateUI?.();
    }

    shot.updateUI();
    return shotLi;
}

async function createShotElements(scene) {
    const shotElements = [];
    for (const shot of scene.shots) {
        shotLi = await createShotLI(shot);
        shotElements.push(shotLi);
    }
    return shotElements;
}

async function loadProjectInfo(){
  const default_projinfo = {
    split_shot_prompt: `
разбей эту сцену из моего сценария на шоты, сгенерируй промпты для нейросети для генерации видео и предоставь в виде json, в ответе предоставь толкьо json в следующем формате:
{
  "SHOT_010" : 
    {
    "prompt" : "подробный промпт для нейросети генератора видео", 
    "camera" : "focal length, shot type", 
    "action_description" : "описания действия которое происходит для аниматора", 
    },

}
    `,
    describe_prompt: `
  Опиши этого персонажа как промпт для генерации картинки.
  `,
    describe_env_prompt: `
  Опиши это окружение как промпт для генерации картинки.
  `,
  gpt_model:"gpt-4o-mini",
  }          

  window.projinfo = await loadBoundJson(window.rootDirHandle, 'projinfo.json',default_projinfo);
}

// LIST FOLDERS
export async function listFolders() {  
  await loadProjectInfo();
  await updateTreeDict();
  await window.treeViewContainer.reset()
  await readArtbookData();
}

// Status bar helper
function updateStatus(message) {
  if (statusBar) {
    statusBar.textContent = message;
  }
  console.log(message);
}

window.updateStatus = updateStatus;





