const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /* DESIGN -> main */
  sendScene: (sceneObj) => ipcRenderer.send('scene:update', sceneObj),
  toggleOverlay: (show)   => ipcRenderer.send('overlay:show', show),

  /* OVERLAY <- main */
  onRenderScene: (cb) => ipcRenderer.on('scene:render', (_, scene) => cb(scene)),
  getSystemFonts: () => ipcRenderer.invoke('get-system-fonts'),
  loadFontFile: (fontPath) => ipcRenderer.invoke('load-font-file', fontPath)
});
