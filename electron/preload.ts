import { contextBridge, ipcRenderer } from 'electron';

// Consolidated Electron API exposure
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,
  platform: process.platform,
  // App info
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  // Native notifications
  showNotification: (title: string, body: string) => {
    ipcRenderer.send('show-notification', { title, body });
  },
  // External link handler with validation
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
});
