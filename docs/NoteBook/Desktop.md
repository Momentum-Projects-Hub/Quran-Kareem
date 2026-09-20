# Quran FM 98.2 (Cairo) — Desktop App

Windows/desktop shell for the same bilingual Quran FM 98.2 (Cairo) live radio player, built with Electron.

Status as of 2026-09-20: code complete (Phase 2), but live audio playback and a packaged installer have **not** been verified in the environment this was built in (see "Known gaps" below) — treat as unverified until confirmed on an unrestricted machine.

---

## What it is

A thin Electron shell (`packages/desktop`, `@quran-fm/desktop`) that wraps the exact same static web build used for the browser app (`packages/web/dist`) — there is no separate desktop UI codebase. On top of the shared web UI, the desktop shell adds:

- A system-tray Play/Pause/Show/Quit menu.
- Background playback that survives the window being closed (closing hides the window instead of quitting the app).
- Lock-screen/media-key controls via the browser's standard MediaSession API (works automatically since Electron embeds Chromium).

---

## Why Electron, not Tauri

The original plan called for Tauri (smaller binaries, native Rust shell). That was reversed during implementation: **this dev environment had no Rust/Cargo toolchain**, and installing one just to ship a v1 audio-player shell wasn't judged worth the setup cost. The original plan had already flagged Electron as an acceptable fallback if Tauri wasn't viable. Electron needs no native toolchain beyond Node — it's pure JS/Chromium.

This can be revisited later if Electron's binary size or memory footprint becomes a real problem.

---

## Architecture

```
packages/desktop/
├── electron/
│   ├── main.js       # BrowserWindow, tray, background-playback window handling
│   ├── preload.js    # contextBridge -> window.desktop (tray play/pause sync)
│   └── icon.png       # currently a 1x1 placeholder — replace before shipping
└── README.md
```

- `electron/main.js` loads either the Vite dev server URL (`ELECTRON_START_URL`, set by the dev script) or the built `packages/web/dist/index.html` (production/packaged builds) — a dev/build duality.
- System tray: `main.js` builds a `Tray` context menu and forwards clicks to the renderer over IPC. The renderer's `usePlayer` (in `packages/web`) reports playback state back via `window.desktop.reportPlaybackState`, bridged through `preload.js`'s `contextBridge`, typed in `packages/web/src/desktop.d.ts`. This keeps the tray label/tooltip in sync with actual playback state.
- `window.desktop` is `undefined` in a plain browser tab — this bridge is a no-op there, so `packages/web` stays a single shared build across both web and desktop targets.
- Lock-screen/media-key handling required **no Electron-specific code** — the standard Web `MediaSession` API, already wired in `packages/web/src/player/usePlayer.ts`, is picked up by Chromium (which Electron embeds) as native OS media transport controls (Windows System Media Transport Controls). It also works unmodified in a plain browser tab.
- Background playback: closing the Electron window hides it rather than quitting, so the tray and audio playback survive in the background. `backgroundThrottling: false` on the `BrowserWindow` prevents Chromium from throttling the `<audio>` element while hidden or minimized. The app only fully quits via the tray's explicit "Quit" menu item.

---

## Stream & playback logic

Desktop reuses 100% of the web app's playback logic — same `@quran-fm/core` `streamResolver` (retry/backoff state machine), same hardcoded primary stream (`https://stream.radiojar.com/8s5u5tpdtwzuv`), same offline-state fallback links. See the Web platform doc for the full stream-resolution rationale; nothing about it is Electron-specific.

---

## Packaging

`packages/desktop` uses `electron-builder`, configured (in `packages/desktop/package.json`'s `build.win.target`) to produce both an NSIS `.exe` installer and an MSI package.

```sh
pnpm --filter @quran-fm/desktop dist
# or: pnpm build:desktop
```

This runs `build:web` first (producing `packages/web/dist/`, bundled in as `extraResources`), then `electron-builder`, which packages the app for Windows. Output lands in `packages/desktop/release/`:

- `Quran FM 98.2 Setup <version>.exe` — NSIS installer
- `Quran FM 98.2 <version>.msi` — MSI package

**Requirements for building the MSI on Windows:**
- The [WiX Toolset](https://wixtoolset.org/) v3 is required for the `msi` target — `electron-builder` downloads it automatically to `~/.cache/electron-builder` on first build (needs network access once).
- Building on Windows is recommended for the `msi`/`nsis` targets; cross-building from macOS/Linux needs Wine and isn't covered.
- `electron/icon.png`/`icon.ico` already carry the station's branding for Windows; a macOS `.icns` variant is still needed before a Mac build ships.

---

## Running locally

**Dev mode** (hot reload against the Vite dev server — run in two terminals):

```sh
pnpm --filter @quran-fm/web dev
pnpm --filter @quran-fm/desktop dev
```

Or the root shortcut (dev server must already be running): `pnpm dev:desktop`.

**Against the built web output** (no dev server needed):

```sh
pnpm --filter @quran-fm/desktop start
```

Runs `build:web` first, then launches Electron against `packages/web/dist/`.

---

## Testing

`@quran-fm/desktop` has no automated test script (`pnpm -r test` skips it cleanly). All shared logic (`streamResolver`, i18n) is covered by `@quran-fm/core`'s tests; the web UI's own tests cover the shared React components. Desktop-specific behavior — tray sync, background-on-close, lock-screen controls — must be verified manually:

1. Press play, confirm real audio starts.
2. Minimize/close the window, confirm playback and the tray icon persist.
3. Use the tray menu's Play/Pause and confirm the in-app UI reflects the change (and vice versa).
4. Confirm OS-level media keys / lock-screen controls (Windows SMTC) work.
5. Use the tray's "Quit" to confirm the app fully exits only there.

---

## Known gaps

- **Not verified in the environment this was built in**: actual launch of the Electron window and live audio playback. `@electron/get`'s binary download (a 115MB zip) was corrupted in that sandbox — the file passed its checksum but its central directory only listed one entry, consistent with a network intermediary truncating/rewriting large binary downloads in that specific sandbox, not a bug in this package's code. This is expected to work normally on a machine with unrestricted internet access — verify with `pnpm --filter @quran-fm/desktop start` and confirm tray, background-on-close, and lock-screen controls all behave as described above before shipping.
- `electron/icon.png` is a 1x1 placeholder — replace with real station branding (plus `.ico`/`.icns` variants) before producing a packaged installer.
- No packaged Windows installer has actually been produced/tested end-to-end in that environment.

---

## Troubleshooting

- **`TypeError: Cannot read properties of undefined (reading 'on')` in `electron/main.js`, or Electron runs as a plain Node script**: `ELECTRON_RUN_AS_NODE` is set in the shell (VS Code's integrated terminal inherits this from VS Code's own Electron process), which makes `require('electron')` return a path string instead of the Electron API. Fix: `unset ELECTRON_RUN_AS_NODE` before running desktop commands, or use a terminal outside VS Code.
- **"Electron failed to install correctly" / `dev`/`start` fails on first run**: the `electron` package's postinstall download can fail silently on some Node versions (its `extract-zip` dependency has been observed to stop after extracting only the first file). Re-run `pnpm install`; if `node_modules/.pnpm/electron@.../node_modules/electron/dist` only has a couple of files with no `electron.exe`, delete `dist` and `path.txt` there and re-run `node install.js` from that directory (or reinstall with a different, LTS Node version) to force a clean re-download/extract.
