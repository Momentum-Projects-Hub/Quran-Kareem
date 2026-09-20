const { contextBridge, ipcRenderer } = require('electron')

// Matches the `Window.desktop` shape declared in packages/web/src/desktop.d.ts.
// Kept deliberately tiny — just enough for tray/lock-screen play-pause sync.
contextBridge.exposeInMainWorld('desktop', {
  reportPlaybackState: (isPlaying) => ipcRenderer.send('player:state-changed', isPlaying),
  onTrayTogglePlayback: (callback) => ipcRenderer.on('tray:toggle-playback', callback),
})
