# packages/mobile

`@quran-fm/mobile` — Expo (React Native) app for iOS/Android. Phase 3 of the
implementation plan; see [docs/App-dev.md](../../docs/App-dev.md) §7, §10, §12.

Reuses `@quran-fm/core` for stream resolution (`streamResolver`) and i18n
strings — same source of truth as `packages/web`. Background/lock-screen
playback is provided by `react-native-track-player`, wrapped as a core
`AudioAdapter` in `src/player/trackPlayerAdapter.ts`.

## Native module caveat

`react-native-track-player` ships no Expo config plugin, so this app cannot
run inside plain Expo Go — it needs a dev client / bare build:

```sh
pnpm install
pnpm --filter @quran-fm/mobile prebuild   # generates android/ and ios/ native projects
pnpm --filter @quran-fm/mobile android    # or: pnpm --filter @quran-fm/mobile ios
```

`assets/icon.png`, `assets/splash.png`, and `assets/station-artwork.png` are
1x1 placeholders — replace with real branding before shipping (same as
`packages/desktop/electron/icon.png`).

## Publishing to Google Play / Apple App Store

Builds and submissions go through EAS Build/Submit (`eas.json`, `eas-cli`
devDependency) instead of local Gradle/Xcode builds:

```sh
pnpm --filter @quran-fm/mobile build:android   # eas build --platform android --profile production
pnpm --filter @quran-fm/mobile submit:android  # eas submit --platform android --latest
pnpm --filter @quran-fm/mobile build:ios       # eas build --platform ios --profile production
pnpm --filter @quran-fm/mobile submit:ios      # eas submit --platform ios --latest
```

Full walkthrough (developer account setup, store listing requirements,
signing/credentials) is in
[docs/Running-and-Testing.md § Publishing the mobile app to the app stores](../../docs/Running-and-Testing.md#publishing-the-mobile-app-to-the-app-stores).
`eas.json`/`app.json` still have `REPLACE_WITH_*` placeholders for the EAS
project ID and Apple/Google account IDs until those are filled in.

## Not verified in this environment

Building/running Android or iOS requires native SDKs (Android Studio /
Xcode) that aren't available in this sandboxed dev environment — the code
here has not been run on a simulator or device. Before shipping, verify on
a physical device: background audio survives app backgrounding, lock-screen
transport controls work, and the RTL restart notice (§8) behaves correctly
when switching languages.
