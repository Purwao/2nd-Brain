const { contextBridge, ipcRenderer } = require('electron');
const os = require('os');

contextBridge.exposeInMainWorld('brainAPI', {
  classify: (text) => ipcRenderer.invoke('classify-tags', text),
  addNote: ({ text, tags }) => ipcRenderer.invoke('add-note', { text, tags }),
  getNotes: () => ipcRenderer.invoke('get-notes'),
  getTags: () => ipcRenderer.invoke('get-tags'),
  delNote: async (id) => ipcRenderer.invoke('del-note', id),
  checkDb: async () => ipcRenderer.invoke('check-db'),
  dropDatabase: async () => ipcRenderer.invoke('drop-database'),
  getFilteredTags:(tag) => ipcRenderer.invoke('get-filtered-tags',tag),
  close: ()=>ipcRenderer.invoke('close-window'),
  minimize: ()=>ipcRenderer.invoke('minimize-window'),
  maximize: ()=>ipcRenderer.invoke('maximize-window'),
});

contextBridge.exposeInMainWorld('systemInfo', {
  user: os.userInfo().username,
  host: os.hostname(),
});