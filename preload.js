const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('still',{get:()=>ipcRenderer.invoke('state'),act:(name,payload)=>ipcRenderer.invoke('action',name,payload),onState:fn=>ipcRenderer.on('state',(_,data)=>fn(data))});
