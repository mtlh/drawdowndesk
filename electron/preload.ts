import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,

  // Example: You could add native notifications here
  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', { title, body });
  },

  // Get app version
  getVersion: () => ipcRenderer.invoke('get-app-version'),

  // Open external links
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
});

// Expose environment info to renderer
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  platform: process.platform,
});
