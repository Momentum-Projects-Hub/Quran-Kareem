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

  // Closing the window hides it instead of quitting, so playback (and the
  // tray controls) survive in the background — mirrors the mobile/lock-screen
  // background-playback requirement from docs/App-dev.md §11.
  mainWindow.on('close', (event) => {
    if (app.isQuitting) return
    event.preventDefault()
    mainWindow?.hide()
  })
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
        click: () => {
          app.isQuitting = true
          app.quit()
        },
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

app.on('before-quit', () => {
  app.isQuitting = true
})

// Keep the app (and audio playback) alive in the tray when all windows are
// closed — the app only exits via the tray's explicit "Quit" action.
app.on('window-all-closed', () => {})
