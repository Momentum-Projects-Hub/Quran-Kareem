# Running & Testing Quran FM 98.2

Practical guide for getting the app running locally and exercising its tests. For architecture, stream-resolution rationale, and the phased roadmap, see [App-dev.md](./App-dev.md).

Currently `packages/core`, `packages/web`, `packages/desktop` (Electron), and `packages/mobile` (Expo/React Native) are implemented — see [App-dev.md §10](./App-dev.md#10-phased-roadmap). Mobile has not been run on an actual device/simulator in the environment this was built in (no Android Studio/Xcode there) — see the Mobile section below.

---

## Prerequisites

- Node.js >= 18 (see `engines` in the root [package.json](../package.json))
- pnpm (workspace-based monorepo — `pnpm-workspace.yaml` includes `packages/*`)

Install pnpm if you don't have it:

```sh
npm install -g pnpm
```

---

## Install dependencies

From the repo root:

```sh
pnpm install
```

On first install, pnpm may need to approve `esbuild`'s postinstall script (already allow-listed via `allowBuilds` in `pnpm-workspace.yaml`). If prompted, run:

```sh
pnpm approve-builds
```

---

## Running the app

### Web (dev server)

```sh
pnpm --filter @quran-fm/web dev
```

Or via the root shortcut:

```sh
pnpm dev:web
```

Opens the Vite dev server at **http://localhost:5173**. The player card, play/pause, bilingual (AR/EN) toggle, and offline-state fallback links are all live here.

### Production build (web)

```sh
pnpm --filter @quran-fm/web build
```

Or:

```sh
pnpm build:web
```

Runs `tsc -b && vite build`, producing static output in `packages/web/dist/` (this is also what Cloudflare Pages builds via the GitHub-connected pipeline — see below and [App-dev.md §6](./App-dev.md#6-web-hosting--cloudflare-pages-github-connected)).

To sanity-check the production build locally:

```sh
pnpm --filter @quran-fm/web preview
```

### Desktop (Electron)

`packages/desktop` wraps the `@quran-fm/web` production build in an Electron shell (see [packages/desktop/README.md](../packages/desktop/README.md) for how it works — tray, MediaSession, `window.desktop` bridge).

**Dev mode** (hot-reload against the Vite dev server — run both in separate terminals):

```sh
pnpm --filter @quran-fm/web dev
pnpm --filter @quran-fm/desktop dev
```

Or via the root shortcut (dev server must already be running):

```sh
pnpm dev:desktop
```

**Run against the built web output** (no dev server needed):

```sh
pnpm --filter @quran-fm/desktop start
```

This runs `build:web` first, then launches Electron against `packages/web/dist/`.

### Building the desktop installer

`packages/desktop` uses `electron-builder`, configured (in `packages/desktop/package.json`'s `build.win.target`) to produce an NSIS `.exe` installer. Build with:

```sh
pnpm --filter @quran-fm/desktop dist
```

Or via the root shortcut:

```sh
pnpm build:desktop
```

This runs `build:web` (producing `packages/web/dist/`, bundled in as `extraResources`) and then `electron-builder`, which packages the app for Windows. Output lands in `packages/desktop/release/`:

- `Quran FM 98.2 Setup <version>.exe` — NSIS installer

**Requirements for building on Windows:**

- Building on Windows is recommended for the `nsis` target (cross-building Windows installers from macOS/Linux needs Wine and is not covered here).

**No MSI target:** an MSI build was tried and removed — WiX Toolset v3 (`light.exe`, invoked by electron-builder's `msi` target) has a long-standing bug where it fails with `LGHT0311` on the Arabic product name/shortcuts even though the generated `project.wxs` correctly declares `Codepage="65001"` (UTF-8) on the `<Product>` element; `light.exe` still validates some strings (file names, `<Shortcut Name>`) against codepage 1252 regardless. There's no electron-builder config to work around this, so `msi` was dropped from `build.win.target`, leaving NSIS (which handles Unicode product names fine) as the only Windows installer.

`packages/desktop/electron/icon.png`/`icon.ico` already carry the station's branding; a macOS `.icns` variant is still needed before a Mac build ships, per the desktop package's README.

Statistics in cloudflare: 
https://quranfm-live.pages.dev/api/stats


### Mobile (Expo / React Native)

`packages/mobile` wraps the same `@quran-fm/core` stream-resolution and i18n logic in an Expo app, using `react-native-track-player` for background/lock-screen audio (see [packages/mobile/README.md](../packages/mobile/README.md) and [App-dev.md §7](./App-dev.md#7-mobile-implementation-react-native--implemented-see-12)).

**`react-native-track-player` ships no Expo config plugin**, so this app cannot run inside plain Expo Go — it needs a native (bare) build. Requires Android Studio + an Android SDK (Android) or Xcode on macOS (iOS); neither is available in every dev environment, so treat the commands below as what to run on a machine that has them.

**1. Generate native projects** (only needed once, or after changing `app.json`/native deps):

```sh
pnpm --filter @quran-fm/mobile prebuild
```

This creates `packages/mobile/android/` and `packages/mobile/ios/`.

**2. Run on Android:**

```sh
pnpm --filter @quran-fm/mobile android
```

Requires Android Studio, an SDK/emulator (or a connected physical device with USB debugging enabled).

**3. Run on iOS** (macOS only):

```sh
pnpm --filter @quran-fm/mobile ios
```

Requires Xcode and CocoaPods.

**4. Typecheck** (the only automated check for this package — no unit tests, see Testing below):

```sh
pnpm --filter @quran-fm/mobile typecheck
```

Or via the root shortcut:

```sh
pnpm typecheck:mobile
```

**Branding placeholder:** `packages/mobile/assets/{icon,splash,station-artwork}.png` are 1x1 placeholders (same pattern as `electron/icon.png`) — replace with real station branding before a release build.

---

## Publishing the mobile app to the app stores

Builds are done with **EAS Build** (Expo's cloud build service) rather than building AABs/IPAs locally — it doesn't need a local Android SDK/Xcode, handles code signing/credentials for you, and is the standard path for an Expo bare-workflow app like this one. Config lives in `packages/mobile/eas.json`; `eas-cli` is already a devDependency, so every command below can be run as `pnpm --filter @quran-fm/mobile exec eas ...` (or `cd packages/mobile && npx eas ...`).

### One-time setup

1. **Create/log in to an Expo account**: `pnpm --filter @quran-fm/mobile exec eas login`.
2. **Link the project to EAS**: `pnpm --filter @quran-fm/mobile exec eas init` — this creates an EAS project and writes the real project ID into `app.json`'s `extra.eas.projectId` (currently a placeholder — see below).
3. Replace the placeholders in `packages/mobile/app.json`/`eas.json` before the first real submission:
   - `app.json`: `extra.eas.projectId` (set by `eas init` above).
   - `eas.json`: `submit.production.ios.appleId`/`ascAppId`/`appleTeamId` (Apple submission — see iOS section below); `submit.production.android.serviceAccountKeyPath` (Google Play submission — see Android section below).
4. Bump `app.json`'s `version` (semver, user-facing) for each release; `android.versionCode`/`ios.buildNumber` auto-increment on EAS Build because `eas.json`'s `production` profile sets `"autoIncrement": true` — no manual bump needed for those.

### Android — Google Play

1. **Google Play Console account**: create one at [play.google.com/console](https://play.google.com/console) if you don't have one (one-time $25 registration fee).
2. **Create the app listing**: Play Console → **Create app** → fill in name (`Quran FM 98.2`), default language (Arabic), app/game = App, free/paid = Free, and accept the declarations. This must exist before you can submit a build to it.
3. **Store listing requirements** (Play Console → your app → **Grow → Store presence → Main store listing**): short/full description (AR + EN), a real app icon (512×512 PNG) and feature graphic (1024×500) — replace the 1x1 placeholders in `packages/mobile/assets/` first — plus at least 2 phone screenshots, and a **privacy policy URL** (required even for an app with no accounts/analytics, since it requests background audio + notification permissions).
4. **Content rating & data safety**: Play Console → **Policy → App content** — complete the content rating questionnaire and the Data Safety form (this app collects no personal data; it only persists a locale preference on-device).
5. **Set up Play App Signing + a service account** (needed once, for `eas submit` to upload automatically):
   - Play Console → **Setup → API access** → create/link a Google Cloud project, then create a service account with the **Release Manager** role, and download its JSON key.
   - Save the key as `packages/mobile/google-play-service-account.json` (already gitignored — never commit this file) and confirm it matches `eas.json`'s `submit.production.android.serviceAccountKeyPath`.
6. **Build the release AAB**:
   ```sh
   pnpm --filter @quran-fm/mobile build:android
   ```
   Runs `eas build --platform android --profile production` — builds an Android App Bundle (`.aab`) on Expo's infrastructure. First run also prompts to generate/store an Android signing keystore in EAS (recommended — let EAS manage it) or upload your own.
7. **Submit to Play Console**:
   ```sh
   pnpm --filter @quran-fm/mobile submit:android
   ```
   Runs `eas submit --platform android --latest`, uploading the most recent build to the **internal** track (`eas.json`'s `submit.production.android.track`). Promote internal → closed/open testing → production manually from the Play Console once you're satisfied (Play Console → **Release → Testing/Production**).
8. **Review**: Google's automated + manual review for a new app/listing can take from a few hours up to several days — expect longer on first submission than on updates.

### iOS — Apple App Store

1. **Apple Developer Program account**: enroll at [developer.apple.com](https://developer.apple.com/programs/) ($99/year), required to submit to the App Store.
2. **Create the App Store Connect app record**: [appstoreconnect.apple.com](https://appstoreconnect.apple.com/) → **My Apps** → **+** → **New App** — bundle ID must match `app.json`'s `ios.bundleIdentifier` (`com.quranfm.cairo982`), platform iOS, primary language Arabic.
3. **Fill in `eas.json`'s `submit.production.ios`**: `appleId` (the Apple ID email used for the developer account), `ascAppId` (App Store Connect app's numeric ID, shown in App Store Connect → App Information), `appleTeamId` (Apple Developer Team ID, in the Developer portal's Membership page).
4. **Store listing requirements** (App Store Connect → your app → app version page): description (AR + EN), keywords, support URL, **privacy policy URL** (same requirement as Android — background audio + notifications), screenshots for the required device sizes, and privacy "nutrition label" answers (no data collected).
5. **Build the release IPA**:
   ```sh
   pnpm --filter @quran-fm/mobile build:ios
   ```
   Runs `eas build --platform ios --profile production`. First run prompts to let EAS manage your Apple signing certificate/provisioning profile (recommended) — requires the Apple Developer account from step 1.
6. **Submit to App Store Connect**:
   ```sh
   pnpm --filter @quran-fm/mobile submit:ios
   ```
   Runs `eas submit --platform ios --latest`, uploading the build to App Store Connect / TestFlight. From App Store Connect, add the build to a version, complete "Export Compliance" (this app does no custom encryption — answer accordingly), and submit for review.
7. **Review**: Apple's App Review typically takes 1–3 days; a first submission can take longer and may come back with clarification requests (e.g. about the background-audio justification — `UIBackgroundModes: ["audio"]` is well-justified for a radio-streaming app, but be ready to explain it if asked).

### Notes

- **Not verified in this environment**: no actual EAS build has been run here (no Expo/Apple/Google accounts configured in this sandbox) — `eas init`/`build`/`submit` all require live accounts and network access to Expo's/Apple's/Google's services. The commands above are correct for this project's config but should be dry-run end-to-end once real credentials are available.
- Bare-workflow caveat from the Mobile running section still applies: `expo prebuild` isn't needed before an EAS Build — EAS runs its own managed prebuild (or uses a committed `android`/`ios` folder if one exists) as part of the cloud build, so `packages/mobile/android/`/`ios/` don't need to be committed (see `.gitignore`).
- Placeholder branding assets (`packages/mobile/assets/*.png`) **must** be replaced before submitting — both stores reject 1x1 placeholder icons/screenshots.

---

## Deploying to Cloudflare Pages (GitHub-connected)

The repo is a pnpm workspace monorepo with the web app in `packages/web`, so Pages needs to build from the **repo root** (to resolve the `@quran-fm/core` workspace dependency) but publish `packages/web/dist`. The repo's GitHub remote is `Momentum-Projects-Hub/Quran-Kareem`.

1. **Push to GitHub** (if you haven't already):
   ```sh
   git push origin main
   ```

2. **Create the Pages project:**
   - Log in to the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** tab → **Connect to Git**.
   - Authorize Cloudflare's GitHub app if not already done, then select the `Momentum-Projects-Hub/Quran-Kareem` repository.

3. **Build settings:**
   | Setting | Value |
   |---|---|
   | Production branch | `main` |
   | Framework preset | `Vite` (or `None` — either works since the build command is set explicitly) |
   | Build command | `pnpm --filter @quran-fm/web build` |
   | Build output directory | `packages/web/dist` |
   | Root directory | `/` (leave as repo root — do **not** set it to `packages/web`, or `pnpm install` won't see the workspace and the `@quran-fm/core` dependency will fail to resolve) |

   Cloudflare detects `pnpm-lock.yaml` at the repo root and runs `pnpm install` automatically before the build command — no need to chain `pnpm install &&` yourself.

4. **Environment variables:** none required for the app itself (it talks directly to `stream.radiojar.com` and `mp3quran.net` from the browser — no secrets, no CORS setup needed). If the build fails to pick the right Node/pnpm version, add:
   - `NODE_VERSION` = `20` (or whatever matches your local `node --version`)

   Cloudflare's pnpm version is inferred from `pnpm-lock.yaml`'s lockfile version; a `packageManager` field in the root `package.json` (e.g. `"packageManager": "pnpm@10.x.x"`) pins it exactly if you hit a mismatch.

5. **Deploy:** click **Save and Deploy**. Cloudflare clones the repo, runs the install + build, and publishes `packages/web/dist/`. Every subsequent push to `main` auto-deploys; pushes to other branches or PRs get their own preview URL automatically — no manual upload step anymore.

6. **Project settings to verify** (Pages project → **Settings**):
   - **Custom domains** tab: attach your domain once chosen — Cloudflare issues and auto-renews the TLS certificate.
   - **Caching**: no action needed — Cloudflare Pages caches hashed JS/CSS assets aggressively by default and keeps `index.html` low/no-cache automatically, so new deploys are picked up promptly.
   - SPA fallback routing is already handled by `packages/web/public/_redirects` (copied into `dist/` by the Vite build), so no extra redirect rules are needed in the dashboard.

7. **Post-deploy check:** open the live `*.pages.dev` (or custom domain) URL and confirm playback actually starts — see the manual verification checklist below. A build can succeed while still shipping something broken (e.g. a stale cached `index.html` referencing a deleted JS chunk), so always check the hosted URL, not just that the build went green.

---

## Testing

### Run everything

```sh
pnpm test
```

Runs `test` in every workspace package (`pnpm -r test`) — currently `@quran-fm/core` and `@quran-fm/web`. `@quran-fm/desktop` and `@quran-fm/mobile` have no `test` script, so pnpm skips them cleanly (you'll see `Scope: 4 of 5 workspace projects` in the output — that's expected, not a failure).

### Run a single package's tests

```sh
pnpm --filter @quran-fm/core test
pnpm --filter @quran-fm/web test
```

**`@quran-fm/core`** (Vitest): covers `streamResolver`'s retry/backoff state machine (success path, retry-then-succeed, exhaust-retries-to-offline, `stop()` cancelling pending retries) and `mp3quran.ts` response parsing against the corrected `{ radios: [...] }` shape.

**`@quran-fm/web`** (Vitest + Testing Library, jsdom): covers offline-state rendering (external listen links shown) and the locale/RTL toggle.

**`@quran-fm/mobile`**: no automated test suite. `pnpm --filter @quran-fm/mobile typecheck` (`tsc --noEmit`) is the only automated check; background audio and lock-screen controls need a manual pass on a real device (see the Mobile section above and the checklist below).

### Watch mode (core only)

```sh
pnpm --filter @quran-fm/core test:watch
```

### Lint (web only)

```sh
pnpm --filter @quran-fm/web lint
```

Runs `oxlint`.

---

## Manual verification checklist

Automated tests don't cover actual audio playback. Before relying on a build or shipping a deploy, manually check:

1. **Stream plays**: open the dev server (or preview build), press play, confirm audio from `stream.radiojar.com/8s5u5tpdtwzuv` actually starts (see [App-dev.md §0](./App-dev.md#0-findings-that-change-the-plan) for why this URL must be hit fresh, never cached/resolved).
2. **Offline/retry behavior**: simulate a dropped connection (e.g. throttle/offline in devtools) and confirm the UI retries with backoff, then falls back to the offline state with external listen links (Holy Quran Radio, Surah Quran, Radio Garden).
3. **Locale/RTL toggle**: switch between Arabic and English and confirm `dir`/`lang` on `<html>` flip and the layout mirrors correctly.
4. **After a Cloudflare Pages deploy**: load the live hosted URL (not just localhost) and confirm playback starts there too — a static-hosting deploy can silently ship a stale/broken build that only surfaces on the hosted URL.
5. **Mobile, on a real device (not a simulator)**: press play, background the app (press home / switch apps), confirm audio keeps playing and lock-screen/notification transport controls (play/pause) work; confirm an incoming call or other app's audio pauses playback and it does **not** auto-resume afterward; switch language and confirm the "restart required" prompt appears and RTL layout mirrors correctly after restarting. Simulators are unreliable for background-audio behavior, so this must be done on a physical device.

---

## Troubleshooting

- **pnpm not found**: install globally with `npm install -g pnpm`, then re-run `pnpm install`.
- **Postinstall/build script blocked**: run `pnpm approve-builds` and allow `esbuild` (already declared in `pnpm-workspace.yaml`, but pnpm may still prompt on a fresh machine).
- **Port 5173 already in use**: stop whatever else is using it, or pass `--port` to the dev script: `pnpm --filter @quran-fm/web dev -- --port 5174`.
- **No audio in dev, no console errors**: check for browser autoplay restrictions — the player requires a user gesture (clicking play) before audio can start; this is expected browser behavior, not a bug.
- **`TypeError: Cannot read properties of undefined (reading 'on')` in `electron/main.js`, or Electron just runs as a plain Node script**: `ELECTRON_RUN_AS_NODE` is set in the shell (VS Code's integrated terminal inherits this from the VS Code Electron process itself), which makes `require('electron')` return a path string instead of the Electron API. Fix by unsetting it before running desktop commands: `unset ELECTRON_RUN_AS_NODE` (bash) — or just use a terminal outside VS Code.
- **`Electron failed to install correctly` / desktop `dev`/`start` fails on first run**: the `electron` package's postinstall download can fail silently on some Node versions (its `extract-zip` dependency has been observed to stop after extracting only the first file, with no error). Re-run `pnpm install`, and if the app dir under `node_modules/.pnpm/electron@.../node_modules/electron/dist` only has a couple of files with no `electron.exe`, delete `dist` and `path.txt` there and re-run `node install.js` from that directory (or reinstall with a different Node version, e.g. an LTS release) to force a clean re-download/extract.
- **Mobile `pnpm --filter @quran-fm/mobile android`/`ios` fails immediately, or the app crashes on launch with a native-module error**: `expo prebuild` wasn't run (or is stale after changing `app.json`/adding a native dep) — re-run `pnpm --filter @quran-fm/mobile prebuild`. If it still fails, delete `packages/mobile/android` and `packages/mobile/ios` and re-run `prebuild` for a clean regeneration.
- **Mobile app opens in Expo Go and immediately errors about a missing native module**: expected — `react-native-track-player` isn't supported in Expo Go (§7 of App-dev.md). Use `expo run:android`/`expo run:ios` (via the `android`/`ios` scripts) after `prebuild`, not the Expo Go app/QR code.
