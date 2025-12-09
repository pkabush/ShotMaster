import {sortChildrenById,createCollapsibleContainer} from "./Containers.js";

export async function editableJsonField(json_data, key, parent = null) { 
  //console.log("json field",parent);
  
  const container = await createCollapsibleContainer(key, parent);
  const tex_area = await createResizableTextArea(json_data[key], 1, container, async (newvalue) => { 
    json_data[key] = newvalue; 
    json_data.save();
    //saveBoundJson(json_data); 
  });

  container.setText = async function(text) {
    tex_area.value = text;
    tex_area.autoResize();
    json_data[key] = text; 
    json_data.save();
    //saveBoundJson(json_data); 
  }

  container.onShown = function(){
    tex_area.onShown();
  }

  if (parent) parent.appendChild(container);
  return container;
}

export function createEditableLabel(text = "Editable Label", parent = null,onEdit = null) {
  const label = document.createElement("span");
  label.textContent = text;
  label.className = "editable-label";
  label.tabIndex = 0;
  label.style.cursor = "text";
  label.style.padding = "4px 6px";
  label.style.borderRadius = "4px";
  label.style.display = "inline-block";
  label.style.userSelect = "text";

  function makeEditable() {
    if (label.dataset.editing === "true") return;
    label.dataset.editing = "true";

    const input = document.createElement("input");
    input.type = "text";
    input.value = label.textContent;
    input.className = "edit-input";
    input.style.font = "inherit";
    input.style.padding = "4px 6px";
    input.style.borderRadius = "4px";
    input.style.border = "1px solid #cbd5e1";
    input.style.outline = "none";
    input.style.boxSizing = "border-box";

    label.replaceWith(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);

    let done = false; // prevents double execution

    function finish(action) {
      if (done) return;
      done = true;
      input.removeEventListener("blur", onBlur);
      if (action === "save") {
        label.textContent = input.value;
        if (onEdit) onEdit(input.value);
      }
      label.dataset.editing = "false";
      input.replaceWith(label);
    }
    // When lost focus
    function onBlur() { finish("save"); }
    input.addEventListener("blur", onBlur);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") finish("save");
      else if (e.key === "Escape") finish("cancel");
    });
  }

  label.addEventListener("dblclick", makeEditable);
  label.addEventListener("keydown", (e) => {
    if (e.key === "Enter") makeEditable();
  });

  if (parent) parent.appendChild(label);
  return label;
}

export async function createResizableTextArea( text = '', rows = 1, parent = null, onChangeCallback = null) {
  const textArea = document.createElement('textarea');
  textArea.id = `prompt-area`;
  textArea.placeholder = 'Enter your prompt here...';
  textArea.rows = rows;
  textArea.value = text;

  // Auto-resize function
  const autoResize = () => {
    textArea.style.height = 'auto';
    textArea.style.height = Math.max(textArea.scrollHeight, rows * 16) + 'px';
    //console.log("RESIZE",textArea)
  }

  textArea.addEventListener('input', autoResize);
  textArea.autoResize = autoResize;
  textArea.onShown = autoResize;

  // Debounced auto-save
  let saveTimeout;
  textArea.addEventListener('input', () => {
  //console.log("text area input");
  autoResize();
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
      onChangeCallback?.(textArea.value);
  }, 500);
  });

  // Initial resize
  requestAnimationFrame(autoResize);
  if (parent) parent.appendChild(textArea);
  return textArea;
}

export async function createEditableKeyField(data, key, parent = null) {
  console.log(data)
  const container = document.createElement("div");
  container.className = "editable-field"; // use CSS class
  // Label
  const label = document.createElement("label");
  label.textContent = key;

  // Input
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = `Enter your {$key}} ...`;
  input.value = data[key] || "";

  let timeout;
  input.addEventListener("input", () => {
    clearTimeout(timeout);
    timeout = setTimeout(async () => {
      data[key] =  input.value;
      data?.save()
    }, 300);
  });

  container.appendChild(label);
  container.appendChild(input);

  if (parent) parent.appendChild(container);
  return container;
}

export async function createSpacer(parent = null,size = 500) {
  const spacer = document.createElement('div');
  spacer.style.height = `${size}px`;  
  if (parent) parent.appendChild(spacer);
}


export function createDropdown(labelText,options,parent, onChange = null) {
    // Create a container div
    const container = document.createElement("div");
    container.className = "editable-field"; 
    // Create the label if provided
    let label;

    label = document.createElement("label");
    label.textContent = labelText;
    container.appendChild(label);

    // Create the select element
    const select = document.createElement("select");

    // Populate the dropdown
    options.forEach(optionText => {
        const option = document.createElement("option");
        option.value = optionText.toLowerCase().replace(/\s+/g, "-");
        option.text = optionText;
        select.appendChild(option);
    });

    // Add change listener if provided
    if (typeof onChange === "function") {
        select.addEventListener("change", (e) => {
            onChange(e.target.value);
        });
    }

    container.setValue = function(value){
        const defaultValFormatted = value.toLowerCase().replace(/\s+/g, "-");
        select.value = defaultValFormatted;
    }

    // Add select to container
    container.appendChild(select);
    if (parent) parent.appendChild(container);
    return container;
}

// Simple Button
export function addSimpleButton(btn, text, parent = null, callback = null)
{
  const simpleBtn = document.createElement('button');
  simpleBtn.id = btn;
  simpleBtn.textContent = text;
  if (parent) {parent.appendChild(simpleBtn);}
  if (callback) {simpleBtn.addEventListener('click', callback )}; 
  return simpleBtn;
}
