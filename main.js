// main.js
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Recursively find font files in a directory
function findFonts(dir) {
  let results = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(findFonts(fullPath));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.ttf' || ext === '.otf') {
          results.push(fullPath);
        }
      }
    }
  } catch (e) {
    // ignore errors (e.g., permission issues)
  }
  return results;
}

// Scan standard system font directories for TTF/OTF files
function scanSystemFonts() {
  const fontsDirs = [];
  const platform = process.platform;
  if (platform === 'win32') {
    const windir = process.env.WINDIR || 'C:\\Windows';
    fontsDirs.push(path.join(windir, 'Fonts'));
  } else if (platform === 'darwin') {
    fontsDirs.push('/System/Library/Fonts', '/Library/Fonts', path.join(os.homedir(), 'Library', 'Fonts'));
  } else {
    fontsDirs.push('/usr/share/fonts', '/usr/local/share/fonts', path.join(os.homedir(), '.fonts'),
path.join(os.homedir(), '.local', 'share', 'fonts'));
  }
  const fontPaths = fontsDirs.reduce((acc, dir) => acc.concat(findFonts(dir)), []);
  const unique = Array.from(new Set(fontPaths));
  const fonts = unique.map(fp => ({
    name: path.basename(fp, path.extname(fp)),
    path: fp
  }));
  fonts.sort((a, b) => a.name.localeCompare(b.name));
  return fonts;
}

// IPC handlers for font listing and loading
ipcMain.handle('get-system-fonts', () => scanSystemFonts());
ipcMain.handle('load-font-file', (event, fontPath) => {
  try {
    const data = fs.readFileSync(fontPath);
    return data.toString('base64');
  } catch (e) {
    console.error('Error loading font file:', fontPath, e);
    return null;
  }
});

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
