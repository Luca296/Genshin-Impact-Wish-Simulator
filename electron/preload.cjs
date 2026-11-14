const {contextBridge, ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('desktop', {
  backup: text=>ipcRenderer.invoke('backup:save',text),
  export: text=>ipcRenderer.invoke('backup:export',text),
  import: ()=>ipcRenderer.invoke('backup:import'),
  list: ()=>ipcRenderer.invoke('backup:list'),
  restore: name=>ipcRenderer.invoke('backup:read',name),
  onCommand: callback=>ipcRenderer.on('desktop:command',(_event,command)=>callback(command)),
  ready: ()=>ipcRenderer.send('desktop:ready')
});
