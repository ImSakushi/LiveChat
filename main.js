// main.js
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');

let designWindow;
let overlayWindow;

function createWindows() {
  /* ---------- Fenêtre DESIGN (UI de création) ---------- */
  designWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  designWindow.loadFile(path.join(__dirname, 'renderer', 'design.html'));
  designWindow.webContents.openDevTools();


  /* ---------- Calcule la taille de l'écran courant ---------- */
  const { width, height } = screen.getPrimaryDisplay().bounds;
  // ou, si tu préfères exclure la barre des tâches :
  // const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  /* ---------- Fenêtre OVERLAY (toujours au-dessus, transparente) ---------- */
  overlayWindow = new BrowserWindow({
    width,
    height,
    x: 0,            // positionne bien en haut-gauche
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    focusable: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  overlayWindow.hide();

  /* ---------- Bus interne : DESIGN -> OVERLAY ---------- */
  ipcMain.on('scene:update', (_, sceneJson) => {
    overlayWindow.webContents.send('scene:render', sceneJson);
    overlayWindow.showInactive();
  });
  ipcMain.on('overlay:show', (_, show) => {
    show ? overlayWindow.showInactive() : overlayWindow.hide();
  });
}

app.whenReady().then(createWindows);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindows();
});
