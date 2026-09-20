# Quran FM 98.2 (Cairo) — Mobile App

React Native / Expo mobile app (iOS + Android) for the same bilingual Quran FM 98.2 (Cairo) live radio player, with background audio and lock-screen controls.

Status as of 2026-09-20: code complete (Phase 3), but **not verified on an actual device or simulator** in the environment this was built in (no Android Studio/Xcode there) — treat as unverified until run once on real hardware.

---

## What it is

`packages/mobile` (`@quran-fm/mobile`) — Expo SDK 57 / React Native 0.87 / React 19.2 (matching `packages/web`'s React 19 major so shared TypeScript types line up). It reuses the exact same `@quran-fm/core` stream-resolution and i18n logic as web and desktop, with a mobile-native player UI and background audio service.

---

## Why `react-native-track-player` (not `expo-av`)

Lock-screen transport controls and a background playback service are core requirements for a radio app, not optional extras — so `react-native-track-player` was chosen over the simpler but weaker-background-support `expo-av`.

**Consequence:** `react-native-track-player` ships **no Expo config plugin** (verified against the published package — no `app.plugin.js`). This means the app **cannot run inside plain Expo Go** and requires `expo prebuild` to generate native `android/`/`ios/` projects (the Expo "bare workflow"), not the managed workflow.

---

## Architecture

```
packages/mobile/
├── App.tsx           # LocaleProvider + EnhancedPlayer
├── index.js          # registerRootComponent + TrackPlayer.registerPlaybackService
├── app.json           # Expo config: bundle IDs, background-audio permissions
├── assets/            # icon.png, splash.png, station-artwork.png — 1x1 placeholders, see below
├── eas.json            # EAS Build/Submit profiles
└── src/
    ├── i18n/LocaleContext.tsx   # AsyncStorage-persisted locale + RTL restart notice
    └── player/
        ├── usePlayer.ts           # wires core's streamResolver to TrackPlayer
        ├── trackPlayerAdapter.ts  # react-native-track-player -> core AudioAdapter
        ├── playbackService.ts     # TrackPlayer background service (remote play/pause/stop)
        ├── EnhancedPlayer.tsx     # main player screen UI
        ├── EqualizerBars.tsx      # Animated equalizer bars
        └── OfflineLinks.tsx
```

Key implementation points:

1. **Permissions** declared in `app.json` (applied to native projects at `expo prebuild` time):
   - iOS: `ios.infoPlist.UIBackgroundModes: ["audio"]`.
   - Android: `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `WAKE_LOCK`.
2. `index.js` calls `TrackPlayer.registerPlaybackService(() => playbackService)` at module scope — required so the service can run detached from the React tree (e.g. after the app is killed on Android). `playbackService.ts` wires `Event.RemotePlay`/`RemotePause`/`RemoteStop` to the corresponding `TrackPlayer` calls.
3. `trackPlayerAdapter.ts` implements the same `AudioAdapter` contract (`play(url)`/`stop()`) as the web app's `audioAdapter.ts` — `play()` resolves once `Event.PlaybackState` reports `State.Playing` and rejects on `Event.PlaybackError`. This means `@quran-fm/core`'s retry/backoff state machine drives mobile identically to web with **zero duplicated logic**. Every `play()` call does `TrackPlayer.reset()` then re-adds the track with the fresh public stream URL — it never caches the resolved RadioJar redirect, for the same reason it must not be cached on web (the redirect token expires in seconds).
4. **Lock-screen metadata**: title/artist from the station name in the current locale, artwork from a bundled local asset (currently a placeholder — no remote image dependency for lock-screen display). `TrackPlayer.updateOptions({ capabilities: [Play, Pause, Stop], ... })` registers transport controls once via `ensurePlayerSetup()`.
5. **Interruptions** (phone calls, other audio apps): `Event.RemoteDuck` triggers a stop when the duck is paused or permanent. The app does **not** auto-resume when the interruption ends — the user must tap play again, avoiding a jarring surprise resume.
6. **i18n/RTL**: `LocaleContext.tsx` persists locale via `@react-native-async-storage/async-storage` (mobile's equivalent of `localStorage`), defaults to Arabic on first launch, and calls `I18nManager.allowRTL(true)` / `forceRTL(wantsRtl)` on locale change. Since React Native's RTL flip only fully applies after a JS bundle reload, an `Alert` tells the user to restart the app rather than silently leaving a half-mirrored layout.

---

## Building & distribution

Builds and submissions go through **EAS Build/Submit** (Expo's cloud build service) rather than local Gradle/Xcode builds — no local Android SDK/Xcode needed, and it handles code signing/credentials. Config lives in `packages/mobile/eas.json` and `app.json`'s `extra.eas.projectId` — both still contain `REPLACE_WITH_*` placeholders until `eas init` and real account IDs are filled in.

```sh
pnpm --filter @quran-fm/mobile prebuild          # generates android/ and ios/ native projects
pnpm --filter @quran-fm/mobile android           # requires Android Studio/SDK
pnpm --filter @quran-fm/mobile ios               # requires Xcode (macOS only)
pnpm --filter @quran-fm/mobile typecheck         # tsc --noEmit — the only automated check
pnpm --filter @quran-fm/mobile build:android     # eas build --platform android --profile production
pnpm --filter @quran-fm/mobile submit:android    # eas submit --platform android --latest (Google Play)
pnpm --filter @quran-fm/mobile build:ios         # eas build --platform ios --profile production
pnpm --filter @quran-fm/mobile submit:ios        # eas submit --platform ios --latest (App Store)
```

Note: `expo prebuild` is **not** needed before an EAS Build — EAS runs its own managed prebuild (or uses a committed `android`/`ios` folder if one exists) as part of the cloud build.

### Publishing to Google Play

1. Create a Google Play Console account ($25 one-time registration) and the app listing (name `Quran FM 98.2`, default language Arabic, free app).
2. Fill in store listing requirements: AR + EN descriptions, real app icon (512×512) and feature graphic (1024×500) — replace the placeholder assets first — at least 2 phone screenshots, and a **privacy policy URL** (required because the app requests background-audio + notification permissions, even though it collects no personal data).
3. Complete the content rating questionnaire and Data Safety form.
4. Set up Play App Signing + a service account (Play Console → Setup → API access) with the **Release Manager** role; save its JSON key as `packages/mobile/google-play-service-account.json` (gitignored, never commit it) matching `eas.json`'s `submit.production.android.serviceAccountKeyPath`.
5. `build:android` then `submit:android` uploads to the **internal** track; promote internal → closed/open testing → production manually from the Play Console.
6. Google's review can take from a few hours to several days, longer on first submission.

### Publishing to the Apple App Store

1. Enroll in the Apple Developer Program ($99/year).
2. Create the App Store Connect app record — bundle ID must match `app.json`'s `ios.bundleIdentifier` (`com.quranfm.cairo982`), platform iOS, primary language Arabic.
3. Fill in `eas.json`'s `submit.production.ios`: `appleId`, `ascAppId` (App Store Connect numeric app ID), `appleTeamId` (Developer Team ID).
4. Store listing requirements: AR + EN description, keywords, support URL, privacy policy URL (same background-audio/notifications justification as Android), screenshots, and privacy "nutrition label" answers (no data collected).
5. `build:ios` then `submit:ios` uploads to App Store Connect / TestFlight; complete "Export Compliance" (no custom encryption) and submit for review.
6. Apple's review typically takes 1–3 days; a first submission may come back with clarification requests (e.g. about the background-audio justification — `UIBackgroundModes: ["audio"]` is well-justified for a radio app, but be ready to explain it).

**Not verified in the environment this was built in**: no actual EAS build has been run — `eas init`/`build`/`submit` all require live Expo/Apple/Google accounts and network access. The commands above are correct for this project's configuration but should be dry-run end-to-end once real credentials are available.

---

## Running locally

```sh
pnpm --filter @quran-fm/mobile typecheck   # or: pnpm typecheck:mobile
pnpm --filter @quran-fm/mobile prebuild    # once, or after changing app.json / native deps
pnpm --filter @quran-fm/mobile android     # requires Android Studio + SDK/emulator or a connected device
pnpm --filter @quran-fm/mobile ios         # macOS only, requires Xcode + CocoaPods
```

---

## Testing

No automated test suite exists for this package (no `test` script — `pnpm -r test` skips it cleanly). `pnpm --filter @quran-fm/mobile typecheck` is the only automated check, and it passes — confirming `trackPlayerAdapter.ts`'s `AudioAdapter` implementation, `LocaleContext.tsx`, and all component props type-check correctly against `@quran-fm/core` and `react-native-track-player`'s types.

Everything behavioral requires a **manual pass on a real physical device** (simulators are unreliable for background-audio behavior):

1. Press play, background the app (home button / app switcher), confirm audio keeps playing.
2. Confirm lock-screen/notification transport controls (play/pause) work while backgrounded.
3. Trigger an incoming call or another app's audio and confirm playback pauses — and does **not** auto-resume afterward.
4. Switch language and confirm the "restart required" prompt appears, and RTL layout mirrors correctly after restarting.

---

## Known gaps

- **Not verified**: running on an actual Android/iOS simulator or device — no native toolchains were available in the environment this was built in. Before shipping: run `prebuild` then `android`/`ios` on a machine with the native toolchains installed, and walk through the manual checklist above.
- `packages/mobile/assets/{icon,splash,station-artwork}.png` are 1x1 placeholders — **must** be replaced before submitting to either app store (both reject placeholder icons/screenshots).
- `app.json`'s `extra.eas.projectId` and `eas.json`'s Apple/Google submission fields are still `REPLACE_WITH_*` placeholders pending `eas init` and real account setup.

---

## Troubleshooting

- **`pnpm --filter @quran-fm/mobile android`/`ios` fails immediately, or the app crashes on launch with a native-module error**: `expo prebuild` wasn't run (or is stale after changing `app.json`/adding a native dependency) — re-run `pnpm --filter @quran-fm/mobile prebuild`. If it still fails, delete `packages/mobile/android` and `packages/mobile/ios` and re-run `prebuild` for a clean regeneration.
- **App opens in Expo Go and immediately errors about a missing native module**: expected — `react-native-track-player` isn't supported in Expo Go. Use `expo run:android`/`expo run:ios` (via the `android`/`ios` scripts) after `prebuild`, not the Expo Go app/QR code.
