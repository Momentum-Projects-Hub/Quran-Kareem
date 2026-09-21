const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require('electron')
const path = require('node:path')

/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {Tray | null} */
let tray = null
let isPlaying = false

// Set by the dev script to point at the Vite dev server for hot reload;
// unset in production/`pnpm run start`, where the pre-built web/dist is loaded instead.
const DEV_SERVER_URL = process.env.ELECTRON_START_URL

function resolveIndexHtml() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'web-dist', 'index.html')
    : path.join(__dirname, '..', '..', 'web', 'dist', 'index.html')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 680,
    minWidth: 360,
    minHeight: 560,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Live radio must keep decoding/streaming while the window is minimized
      // or hidden to the tray — Chromium throttles background timers by default.
      backgroundThrottling: false,
    },
  })

  if (DEV_SERVER_URL) {
    mainWindow.loadURL(DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(resolveIndexHtml())
  }
}

function updateTray() {
  if (!tray) return
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: isPlaying ? 'Pause' : 'Play',
        click: () => mainWindow?.webContents.send('tray:toggle-playback'),
      },
      { label: 'إظهار الإذاعة', click: () => mainWindow?.show() },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => app.quit(),
      },
    ]),
  )
  tray.setToolTip(`إذاعة القرآن الكريم من القاهرة — ${isPlaying ? 'تشغيل' : 'إيقاف مؤقت'}`)
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'icon.png'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)
  tray.on('click', () => {
    if (!mainWindow) return
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
  })
  updateTray()
}

ipcMain.on('player:state-changed', (_event, playing) => {
  isPlaying = Boolean(playing)
  updateTray()
})

app.whenReady().then(() => {
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
    else mainWindow?.show()
  })
})

// Closing the window quits the app, matching normal desktop app behavior
// on Windows/Linux. macOS keeps the dock icon/process alive per platform
// convention until the user explicitly quits (Cmd+Q).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
