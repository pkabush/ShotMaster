
// Select SHOT FOLDER
async function selectShot(shot) {

}
// SELECT SCENE FOLDER
async function selectSceneFolder(scene) {
  window.currentFolderHandle = scene.handle;
  document.querySelectorAll('#folders li').forEach(el => el.classList.remove('selected'));
  contentsPanel.innerHTML = '';

  // Create scene elements in contents panel
  // Create the prompt UI and get references to the textarea and status

  const shotPreviewStrip = await createShotPreviewStrip(scene);
  const sceneSettingsContainer = document.createElement('div');

  // --- Shot name ---
  const title = document.createElement('div');
  title.textContent = scene.name;
  title.classList.add('shot-info-title');  // optional CSS class
  sceneSettingsContainer.appendChild(title);


  //await createPromptUI(scene.handle, "script",parent = sceneSettingsContainer);
  await editableJsonField(scene.sceneinfo, "script", sceneSettingsContainer);

  buttonContainer = CreateButtonsContainer(parent = sceneSettingsContainer);
  //SplitIntoShotsBtn = addSimpleButton('split-into-shots-btn', 'Split Into Shots',buttonContainer);


  // Scene SHOTS json Field
  const shots_json_field = await editableJsonField(scene.sceneinfo, "shotsjson", sceneSettingsContainer);
  // Currently not used button
  //ImportShotsBtn = addSimpleButton(buttonContainer, 'import-shots-btn', 'Import Shots Clipboard');
  //ImportShotsBtn.addEventListener('click', async () => { await importShotsFromClipboard(); });

  generateSplitIntoShotsPromptBtn = addSimpleButton('generate-split-into-shots-prompt-btn', 'Generate Split Prompt',buttonContainer);
  generateSplitIntoShotsPromptBtn.addEventListener('click', async () => { 
      const tags_string = await scene.getTagsString() 
    
      base_text = `${window.projinfo.split_shot_prompt} \n      
      ${tags_string} \n
      ${scene.sceneinfo.script}
      `;
      navigator.clipboard.writeText(base_text)
      console.log("GENERATED PROMPT:\n", base_text)
    });

  generateSplitIntoShotsPromptRefsBtn = addSimpleButton('generate-split-into-shots-prompt-refs-btn', 'Generate Split Prompt(with REFS)',buttonContainer);
  generateSplitIntoShotsPromptRefsBtn.addEventListener('click', async () => { 
    //console.log("SCENE",scene);
    //console.log("USER_DATA",window.userdata);
    const tags_string = await scene.getTagsString() 

    base_text = `${window.projinfo.split_shot_prompt} \n    
    ${tags_string}\n
    ${scene.sceneinfo.script}
    `;

    base_text = `${window.projinfo.split_shot_prompt} \n    
    ${scene.sceneinfo.script}
    `;

    console.log("GENERATED PROMPT:", base_text)
    //console.log(await scene.getTags())

    //const answer = await OpenRouter.txt2txt(base_text); 
    // this one uploads images as tags, but we only use prompts now
    //const answer = await GPT.txt2txt(base_text, await scene.getTags());
    const answer = await GPT.txt2txt(base_text);
    shots_json_field.setText(answer);
    
    });

  generateShotsFromJsonBtn = addSimpleButton('generate-shots-from-json-btn', 'Generate Shots from JSON',buttonContainer);
  generateShotsFromJsonBtn.addEventListener('click', async () => {    
    shotdict = JSON.parse(scene.sceneinfo.shotsjson);
    for (const key in shotdict) {
      console.log('Generating shot:', key);
      console.log('Shot data:', shotdict[key]);
      shothandle = await scene.handle.getDirectoryHandle(key, { create: true } );
      shotinfohandle = await shothandle.getFileHandle('shotinfo.json', { create: true } );
      shotinfo = { ...default_shotinfo, ...shotdict[key] ,...{____handle: shotinfohandle} };
      await saveBoundJson(shotinfo);
    }
    await scene.LoadShots()
    await shotPreviewStrip.loadShots();
  });  

  // Add TAG Button
  tagsContainer = await createTagsContainer(scene,sceneSettingsContainer);
  await artbookUI.createAddTagButton(buttonContainer, (img) => {
    console.log(img);
    //img.createTagItem(tagsContainer);
    tagsContainer.addTag(img);
    scene.addTag(img);
  });
  

  // SCENE LOG
  addSimpleButton('log-scene', 'LOG',buttonContainer, async () => {    
    console.log("SCENE:",scene)  
  }); 

  // SHOTS LOG
  addSimpleButton('log-tags-btn', 'LOG TAGS',buttonContainer, async () => { 
    console.log("SCENE TAGS:\n",await scene.getTagsString() ) 
  }); 


  // copy prompts
  addSimpleButton('copy-prompts-btn', 'MJ Prompts',buttonContainer, async () => {  
     let prompts_string = ""
     for(shot of scene.shots){
        prompts_string += shot.shotinfo.prompt + "\n----\n";
     }
     console.log(prompts_string)
     await navigator.clipboard.writeText(prompts_string);
    }); 

  // copy prompts with Tags
  addSimpleButton('copy-prompts-tags-btn', 'MJ+TAGS',buttonContainer, async () => {  
     const tags_string = await scene.getTagsString()
     let prompts_string = ""
     for(shot of scene.shots){
        prompts_string += shot.shotinfo.prompt + "\n" + tags_string + "\n----\n";
     }
     console.log(prompts_string)
     await navigator.clipboard.writeText(prompts_string);
    }); 



  createSpacer(sceneSettingsContainer); 

  const tabs1 = createTabContainer(contentsPanel);
  tabs1.addTab({ title: 'Scene', content: sceneSettingsContainer });
  tabs1.addTab({ title: 'Shots', content: shotPreviewStrip }); 


}

async function createTagsContainer(scene,parent = null){
  const container = createCollapsibleContainer("Tags",parent)
  
  container.addTag = async function(tag){
    tag.createTagItem(container, (tagdiv,tag) => {
      console.log(tagdiv,tag);
      tagdiv.remove();
      scene.removeTag(tag);

    });
  }


  for(const tag of scene.sceneinfo.tags){    
    img = await artbookUI.path2img(tag);
    container.addTag(img)    
  }

  return container
}

// Shot INFO CARD 
async function CreateShotInfoCard(shot,parent = null) {
  const container = document.createElement('div');
  container.classList.add('shot-info'); 

  // --- Shot name ---
  const title = document.createElement('div');
  title.textContent = shot.name;
  title.classList.add('shot-info-title');  // optional CSS class
  container.appendChild(title);

  // --- Prompt TextArea ---
  //PromptTextArea = await createPromptUI(shot.handle, "prompt", container);
  await editableJsonField(shot.shotinfo, "prompt", container);
  await editableJsonField(shot.shotinfo, "camera", container);
  await editableJsonField(shot.shotinfo, "action_description", container);
  
  CreateShotInfoCardButtons(shot,container); 

  container.taskContainer = await createTaskContainer(shot,container);

  // Create Images Preview Folder
  await createMediaFolderPreview(shot,"results",container)
  await createMediaFolderPreview(shot,"resultVods",container)

  // Append to parent
  if (parent) parent.appendChild(container);
  return container;
}
// Shot Preview Strip
async function createShotPreviewStrip(scene) {
  const container = document.createElement('div');
  container.loadShots = async function(){
    this.innerHTML = ''    
    resizableArea = createResizableContainer(parent = this);
    shotsStrip = createHorizontalContainer(resizableArea)

    // --- Create and append each shot preview ---
    for (const shot of scene.shots) {
      const shotElement = await CreateShotPreview(shot);
      shotsStrip.appendChild(shotElement);
      const shot_info = await CreateShotInfoCard(shot, parent = this);
      shot_info.style.display = 'none';

      // --- Add click event to show corresponding info ---
      shotElement.addEventListener('click', () => {
        document.querySelectorAll('.shot-info').forEach(el => el.style.display = 'none');
        shot_info.style.display = 'block';
      });
    }  
    //add Spacer
    createSpacer(this);
  }  
  await container.loadShots();

  return container;
}

// Shot Preview Icon
async function CreateShotPreview(shot) {
  // Container for the shot
  const container = document.createElement("div");
  container.classList.add("shot-preview");

  // Image element
  const img = document.createElement("img");

  container.update = async function(){
    img.src = "https://picsum.photos/id/237/200/300";

    if (shot.shotinfo.srcImage){
      const resultsDir = await shot.handle.getDirectoryHandle("results", { create: false });
      const fileHandle = await resultsDir.getFileHandle(shot.shotinfo.srcImage, { create: false });

      const file = await fileHandle.getFile();
      const url = URL.createObjectURL(file);
      img.src = url;
    }
  }
  container.update()

  container.appendChild(img);

  // Label
  const label = document.createElement("div");
  label.textContent = shot.name;
  label.classList.add("shot-preview-label");
  container.appendChild(label);

  // EVENT LISTENERS
  document.addEventListener("shotupdate", (e) => {
      if (e.detail.shot == shot){
        container.update()
      }
  });

  return container;
}
// Simple Button
function addSimpleButton(btn, text, parent = null, callback = null)
{
  const simpleBtn = document.createElement('button');
  simpleBtn.id = btn;
  simpleBtn.textContent = text;
  if (parent) {parent.appendChild(simpleBtn);}
  if (callback) {simpleBtn.addEventListener('click', callback )}; 
  return simpleBtn;
}


// Shot Info Card Buttons
async function CreateShotInfoCardButtons(shot,parent = null)
{
  buttonContainer = CreateButtonsContainer(parent);
  
  // --- TEST button ---
  testBtn = addSimpleButton('testBtn', 'Log shot', buttonContainer);
  testBtn.addEventListener('click', async () => { console.log(shot); });

  updateBtn = addSimpleButton('testBtn', 'Update', buttonContainer);
  updateBtn.addEventListener('click', async () => { shot.updateEvent() });

  // --- Shot Status button ---
  changeShotStatusBtn = await createShotStatusButton(shot,buttonContainer);  

  // --- Create Resolve FCPXML button ---
  createResolveXMLButton = addSimpleButton('create-resolve-xml-btn', 'Generate Resolve FCPXML',buttonContainer);
  createResolveXMLButton.addEventListener('click', async () => {    
      const resultsFolder = await window.currentFolderHandle.getDirectoryHandle("results", { create: false });
      await generateFCPXMLFromFolder(resultsFolder);
  });

  // TXT 2 Image
  txt2ImageBtn = addSimpleButton('txt2imgBtn',"txt2img", buttonContainer);
  txt2ImageBtn.addEventListener('click', async () => {   
    console.log("Clicked txt2img:",shot); 
    try {
        const _task = await kieGenerate_txt2img(shot.shotinfo.prompt);
        const task = await shot.addKieTask(_task);  
        parent?.taskContainer?.addTask(task);

    } catch (error) {
      console.error(error);
    }
  });

  img2videoBtn = addSimpleButton('img2videoBtn',"img2video", buttonContainer);
  img2videoBtn.addEventListener('click', async () => {   
    console.log("Clicked img2video:",shot); 
    try {
      const srcImageHandle = await shot.getSrcImageHandle();
      console.log("SRC_IMAGE",srcImageHandle)

      if (srcImageHandle) {
        img_upload_data = await kieUploadFile(srcImageHandle);
        console.log('Image upload data:', img_upload_data.downloadUrl);
        if (img_upload_data && img_upload_data.success)
        {
          const _task = await kieGenerate_RunwayImg2Video(shot.shotinfo.prompt, img_upload_data.downloadUrl);      
          const task = await shot.addKieTask(_task);  
          parent?.taskContainer?.addTask(task);
        }
      }
    } catch (error) {
      console.error(error);
    }
  });

  url2imgBtn = addSimpleButton('url2imgBtn',"importURL", buttonContainer);
  url2imgBtn.addEventListener('click', async () => {   
    try {
        const clipboardText = await navigator.clipboard.readText();
        if (!clipboardText) { return; }
        
        let url;
        try {
            url = new URL(clipboardText).href;
        } catch (err) {
            //console.log("Clipboard does not contain a valid URL:", clipboardText);
            return;
        }

        const resultsHandle = await shot.handle.getDirectoryHandle("results", { create: true });
        await downloadURL(url, resultsHandle);
        console.log("Download completed!");
        await shot.updateEvent(); 
    } catch (err) {
        //console.error("Error in downloadClipboardUrl:", err);
    }
  });



  return buttonContainer
}
// SHOT STATUS TOGGLE
async function createShotStatusButton(shot,parent = null)
{
  const shotToggleBtn = addSimpleButton('shot-toggle-btn', 'Finished',parent);

  function updateShotStatusButton(shotToggleBtn)  {
      shotToggleBtn.style.backgroundColor = shot.shotinfo.finished ? 'lightgreen' : 'lightgrey';
  }

  updateShotStatusButton(shotToggleBtn);
  shotToggleBtn.addEventListener('click', () => {
    updateShotStatus( shot, !shot.shotinfo.finished);
    updateShotStatusButton(shotToggleBtn);
  });
  return shotToggleBtn;
}

// --- MAIN FUNCTION (NOW CLEAN) ---
async function createMediaFolderPreview(shot, folderName, parent = null) {
  // Main Container
  const container = await createCollapsibleContainer(folderName, parent);
  // Images container
  const imagesContainer = document.createElement("div");
  imagesContainer.className = "media-container";

  // --- Extracted FILL FUNCTION ---
  async function fillMediaContainer() {
    let srcImagesHandle = null;
    try {
      srcImagesHandle = await shot.handle.getDirectoryHandle(folderName, { create: false });
    } catch (err) {
      //console.warn(`Media folder "${folderName}" missing`, err);
      return; // stop here but container + callbacks still exist
    }

    imagesContainer.innerHTML = ""; // Clear before refill

    for await (const [name, fileHandle] of srcImagesHandle.entries()) {
      if (fileHandle.kind !== "file") continue;

      const file = await fileHandle.getFile();
      const url = URL.createObjectURL(file);

      // --- IMAGE FILES ---
      if (/\.(png|jpe?g|gif|webp)$/i.test(name)) {
        const wrapper = document.createElement("div");
        wrapper.className = "img-wrapper";
        if (name === shot.shotinfo.srcImage) wrapper.classList.add("highlighted");

        const img = document.createElement("img");
        img.src = url;
        img.className = "media-img";
        img.title = name;

        const btn = document.createElement("button");
        btn.className = "media-hover-btn";
        btn.textContent = "Pick";

        btn.addEventListener("click", (event) => {
          event.stopPropagation();
          shot.shotinfo.srcImage = name;
          shot.saveShotInfo();
          shot.updateEvent();

          imagesContainer.querySelectorAll(".img-wrapper.highlighted")
            .forEach(el => el.classList.remove("highlighted"));

          wrapper.classList.add("highlighted");
        });

        wrapper.append(img, btn);
        imagesContainer.appendChild(wrapper);
      }

      // --- VIDEO FILES ---
      if (/\.(mp4|webm|ogg|mov|mkv)$/i.test(name)) {
        const video = document.createElement("video");
        video.src = url;
        video.style.width = "auto";
        video.style.maxHeight = "300px";
        video.style.objectFit = "contain";
        video.title = name;
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.controls = true;

        imagesContainer.appendChild(video);
      }
    }
  }

  // --- ADD RELOAD METHOD ---
  container.update = async () => {
    await fillMediaContainer(shot, folderName, imagesContainer);
  };


  shot.addUpdateCallback( (data) => {
    console.log("UPDATE Media Container",container);
    console.log(shot,data)
    container.update()
  } )

  // Initial fill
  await fillMediaContainer(shot, folderName, imagesContainer);

  container.appendChild(imagesContainer);
  return container;


}
