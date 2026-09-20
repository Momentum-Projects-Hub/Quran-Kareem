# @quran-fm/desktop

Electron shell wrapping the `@quran-fm/web` build for Windows/macOS/Linux desktop distribution (Phase 2, see [docs/App-dev.md](../../docs/App-dev.md) §5, §10).

Deviates from the original plan's Tauri choice — see docs/App-dev.md §11/§12 for why.

## How it works

- `electron/main.js` creates the `BrowserWindow` and loads either the Vite dev server (`ELECTRON_START_URL`, used by `pnpm dev`) or the pre-built `packages/web/dist/index.html` (used by `pnpm start`/packaged builds).
- Closing the window hides it instead of quitting, so the live stream keeps playing in the background — quitting only happens via the tray's "Quit" item. `backgroundThrottling: false` keeps audio decoding uninterrupted while minimized/hidden.
- Lock-screen and media-key controls come from the standard Web `MediaSession` API (wired in `packages/web/src/player/usePlayer.ts`) — Chromium/Electron surfaces this as Windows System Media Transport Controls automatically, no native Electron code required.
- `electron/preload.js` exposes a minimal `window.desktop` bridge (`packages/web/src/desktop.d.ts`) so the tray's Play/Pause menu item and the in-app player stay in sync; this is a no-op on plain web since `window.desktop` is undefined there.

## Commands

```sh
pnpm install
pnpm --filter @quran-fm/desktop dev     # hot-reload against `pnpm --filter @quran-fm/web dev` (run both)
pnpm --filter @quran-fm/desktop start   # builds web, then runs Electron against the built output
pnpm --filter @quran-fm/desktop dist    # builds web, then packages a Windows installer via electron-builder
```

`electron/icon.png` and `electron/icon.ico` carry the station's 98.2 CAIRO branding (matching `packages/web/public/station-artwork.svg`), used for the app/tray icon and the Windows installer/executable icon respectively. A macOS `.icns` variant still needs to be added before a Mac build ships.
