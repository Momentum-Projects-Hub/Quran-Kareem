export interface DesktopBridge {
  /** Renderer -> main: report current playback state so the tray menu/tooltip stays in sync. */
  reportPlaybackState(isPlaying: boolean): void
  /** Main -> renderer: fired when the user clicks Play/Pause in the tray context menu. */
  onTrayTogglePlayback(callback: () => void): void
}

declare global {
  interface Window {
    /** Only present when running inside the Electron desktop shell (packages/desktop). Undefined on plain web. */
    desktop?: DesktopBridge
  }
}

export {}
