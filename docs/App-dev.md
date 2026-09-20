# Quran FM 98.2 (Cairo) — Implementation Plan

Bilingual (Arabic/English) web, desktop, and mobile app streaming إذاعة القرآن الكريم من القاهرة — Quran FM 98.2.

> This document supersedes the earlier research notes. Corrections found during verification are called out in **Section 0** because they change the architecture.

> **Status (2026-09-20):** Phase 0 and Phase 1 are implemented — see **Section 12**. Phase 2 (desktop) and Phase 3 (mobile) are stubs only.

---

## 0. Findings that change the plan

The original notes assumed the [MP3Quran API](https://www.mp3quran.net/api) could dynamically resolve the Cairo 98.2 stream by name-matching. Verification against the live API turned up two problems:

1. **Wrong endpoint shape.** The real endpoint is `GET https://www.mp3quran.net/api/v3/radios`, and the response is an **object** wrapping the array — `{ "radios": [ { "id", "name", "url", "recent_date" }, ... ] }` — not a bare array at `mp3quran.net`.
2. **No Cairo entry exists.** The current dataset (138 stations) has no entry whose `name` contains `القاهرة` or `Cairo`. MP3Quran's list is almost entirely per-reciter recitation channels, not city/frequency radio stations. **Dynamic lookup for this specific station will reliably return nothing** — it cannot be the primary source of truth.
3. **radio.garden doesn't expose a raw stream URL** via simple HTTP fetch — it's a browser embed/widget, not a stream URL. It can be an "open externally" link, but not an `<audio src>` / `TrackPlayer` source.

**Architectural consequence:** flip the priority order. Treat a **manually-verified, hardcoded stream URL** as the primary source (with periodic revalidation), keep the MP3Quran API integration as a *generic, reusable* "other Quran stations" feature (useful on its own merits, not as this station's resolver), and use radio.garden as an **external "listen on the web" link** shown in the UI when playback fails, not as a programmatic audio source.

**Action item (Phase 0) — DONE.** Fetched the raw HTML of both `holyquranradio.com` and `surahquran.com/Radio-Quran-Cairo.html` directly (`curl`, not a JS-rendered fetch) and both embed the **identical** `<audio>`/`<source>` stream:

```
https://stream.radiojar.com/8s5u5tpdtwzuv
```

Verified with a ranged GET following redirects: the public URL 302-redirects (`Location: http://n0f.radiojar.com/8s5u5tpdtwzuv?rj-ttl=5&rj-tok=...`) to a tokenized RadioJar edge node, which then returns `200 audio/mpeg` with `icy-name: Mini2's Broadcast` — a real, live icecast-style stream. `rj-ttl=5` means **the resolved edge URL is only valid for a few seconds** — it's a redirect resolver, not a stable stream URL.

**Implication:** always point the `<audio>` element / `TrackPlayer` at the public `stream.radiojar.com/8s5u5tpdtwzuv` URL and let the HTTP client (browser, or the native player's HTTP stack) follow the redirect itself on every connection attempt. Never resolve the redirect once and cache/store the `n0f.radiojar.com?...rj-tok=...` URL — it will be expired by the time playback needs it, especially after a reconnect.

---

## 1. Goals & scope

- One core player experience, reused across three targets: **Web**, **Desktop**, **Mobile (iOS/Android)**.
- Bilingual UI: Arabic (RTL) and English (LTR), instant switch, persisted preference.
- Resilient playback: primary hardcoded stream → health-checked alternates → clear "station offline, try web player" state. Never a silent dead button.
- Background/lock-screen playback on mobile; media-key/lock-screen metadata on desktop where the shell supports it.
- Small surface area: this is a single-station live radio player, not a station directory app. Keep it simple.

**Non-goals:** account systems, offline downloads/DVR, multi-station browsing as a first-class feature (may reuse the MP3Quran integration later, but not in v1 scope), push notifications, analytics dashboards.

---

## 2. Tech stack decisions

| Concern | Choice | Why |
|---|---|---|
| Web | React + Vite + TypeScript + Tailwind CSS | Fast dev loop, matches the UI snippets already sketched in the old notes |
| Desktop | Tauri wrapping the same web build | Far smaller binaries and lower memory than Electron for a simple audio-player shell; Rust backend not required beyond Tauri defaults. Electron is the fallback if a Tauri-specific blocker appears (e.g. a needed native audio API) |
| Mobile | React Native (Expo, bare workflow or EAS) + `expo-av` / `react-native-track-player` for background audio | Matches existing notes; `react-native-track-player` specifically for lock-screen controls + background service |
| Shared logic | `packages/core` — plain TypeScript, no framework deps | Stream resolution, health-check, i18n strings, types — imported by web, desktop (via web), and mobile |
| Package management | pnpm workspaces (monorepo) | Single repo, shared core package, avoids version drift between web/mobile copies of the same resolver logic |
| State | React hooks + Context (`usePlayer`, `useLocale`) | App is small; Redux/Zustand is unnecessary overhead |
| i18n | `react-i18next` (or a minimal custom dictionary — see §8) | Standard, RTL-aware, works across RN and web |
| Web hosting | Cloudflare Pages, deployed manually via the dashboard | Free static hosting, global CDN, no server needed — the app is a pure static SPA that talks directly to `stream.radiojar.com` from the client. See §6 |

---

## 3. Monorepo structure

```
quran-fm/
├── packages/
│   ├── core/                 # @quran-fm/core — framework-agnostic: stream resolution, i18n dict, types
│   │   └── src/
│   │       ├── streams.ts               # hardcoded primary stream + fallbacks (see §4)
│   │       ├── streamResolver.ts        # createStreamResolver() — retry/backoff state machine
│   │       ├── streamResolver.test.ts
│   │       ├── mp3quran.ts              # generic MP3Quran API client (separate feature, not this station's resolver)
│   │       ├── mp3quran.test.ts
│   │       ├── index.ts
│   │       └── i18n/
│   │           ├── ar.json
│   │           ├── en.json
│   │           └── index.ts
│   ├── web/                  # @quran-fm/web — Vite + React app (also the source Tauri packages)
│   │   ├── public/           # station-artwork.svg (local, no hotlinked image), _redirects (§6)
│   │   └── src/
│   │       ├── i18n/LocaleContext.tsx   # useLocale() — locale + dir persisted to localStorage
│   │       ├── player/
│   │       │   ├── usePlayer.ts          # wires core's streamResolver to a real <audio>
│   │       │   ├── audioAdapter.ts       # HTMLAudioElement -> core AudioAdapter
│   │       │   ├── EnhancedPlayer.tsx    # main player card UI
│   │       │   ├── EnhancedPlayer.test.tsx
│   │       │   ├── EqualizerBars.tsx
│   │       │   └── OfflineLinks.tsx
│   │       ├── App.tsx
│   │       └── main.tsx
│   └── mobile/                # stub only — see §10, §12 (Phase 3, not yet built)
├── src-tauri/                 # stub only — see §10, §12 (Phase 2, not yet built)
├── pnpm-workspace.yaml
├── package.json
└── docs/
    └── App-dev.md
```

---

## 4. Stream resolution strategy (`packages/core`)

```ts
// packages/core/src/streams.ts
export const PRIMARY_STREAM = {
  id: 'quran-fm-982-cairo',
  name: { ar: 'إذاعة القرآن الكريم من القاهرة', en: 'Quran FM 98.2 — Cairo' },
  // Confirmed via curl against holyquranradio.com & surahquran.com's embedded
  // players (see §0) — both sites hotlink this exact RadioJar stream.
  // The URL itself 302-redirects to a short-lived tokenized edge node
  // (rj-ttl=5s) — DO NOT resolve-and-cache; always hit this URL fresh
  // and let the HTTP client follow the redirect on every (re)connect.
  url: 'https://stream.radiojar.com/8s5u5tpdtwzuv',
};

export const EXTERNAL_LISTEN_LINKS = [
  { label: 'Holy Quran Radio', url: 'https://www.holyquranradio.com/' },
  { label: 'Surah Quran (Cairo)', url: 'https://surahquran.com/Radio-Quran-Cairo.html' },
  { label: 'Radio Garden', url: 'https://radio.garden/listen/quran-fm-98-2-idhaet-alqran-alkrym/GQxvGBNK' },
];
```

Resolution order at app launch and on playback failure:

1. **Primary hardcoded stream** (`PRIMARY_STREAM.url`). Try this first, always — it's the only confirmed-real Cairo 98.2 source.
2. **Health check + retry**: on `error`/`stalled` audio events, retry with backoff (e.g. 3 attempts, 2s/5s/10s) against the same URL — live streams drop connections transiently; don't fail over on the first hiccup.
3. **Give up → offline state**: after retries exhaust, surface a clear "station temporarily unavailable" message with the `EXTERNAL_LISTEN_LINKS` rendered as outbound links (open in browser / system player), not embedded audio.
4. MP3Quran API (`mp3quran.ts`) is **not** part of this fallback chain — it's a separate, optional "browse other Quran stations" feature that can be added later using the corrected endpoint/shape from §0.

**Implemented** in `packages/core/src/streamResolver.ts`. The actual signature differs slightly from the original sketch: it takes an injected `AudioAdapter` (`{ play(url): Promise<void>; stop(): void }`) rather than owning the `<audio>` element itself, so the same retry/backoff state machine can be reused by an `HTMLAudioElement`-backed adapter on web (`packages/web/src/player/audioAdapter.ts`) and, later, a `react-native-track-player`-backed adapter on mobile without duplicating the logic:

```ts
// packages/core/src/streamResolver.ts
export type StreamState = 'idle' | 'loading' | 'playing' | 'retrying' | 'offline';

export interface AudioAdapter {
  play(url: string): Promise<void>;
  stop(): void;
}

export function createStreamResolver(options: {
  adapter: AudioAdapter;
  station?: Station;
  onStateChange?: (s: StreamState) => void;
}): { play(): Promise<void>; stop(): void; getState(): StreamState; getUrl(): string } {
  // owns retry count, backoff timer (RETRY_BACKOFF_MS = [2000, 5000, 10000])
}
```

Covered by unit tests in `streamResolver.test.ts`: success path, retry-then-succeed, exhaust-retries-to-offline, and `stop()` cancelling pending retries.

`mp3quran.ts` (generic client, corrected per §0):

```ts
const MP3QURAN_RADIOS_ENDPOINT = 'https://www.mp3quran.net/api/v3/radios';

export async function fetchAllRadios(): Promise<Radio[]> {
  const res = await fetch(MP3QURAN_RADIOS_ENDPOINT);
  if (!res.ok) throw new Error(`MP3Quran API error: ${res.status}`);
  const data = await res.json();
  return data.radios; // NOTE: object-wrapped, not a bare array
}
```

---

## 5. Web & Desktop implementation

- Reuse the `EnhancedPlayer` visual direction from the old notes (emerald/gold glassmorphism card) but wire it to `useStreamResolver()` from `packages/core` instead of a hardcoded `<audio src>`.
- `preload="none"` on the `<audio>` element (already correctly called out in the old notes) — live streams must not eagerly buffer.
- Local bundled fallback artwork in `public/`, not a hotlinked Unsplash URL — an external image host going down shouldn't break the UI. `onError` on the `<img>` swaps to the local asset.
- Equalizer bars: pure CSS animation keyed off `isPlaying`, no audio-graph analysis needed for v1 (simpler, no `AudioContext`/CORS complications with the stream).
- Tauri shell: point `tauri.conf.json`'s `devPath`/`distDir` at `packages/web`'s dev server/build output; add a system-tray play/pause toggle and native media-key handling as a stretch goal (Tauri plugin or OS media session API).

---

## 6. Web hosting — Cloudflare Pages (manual dashboard deploy)

The web app is a pure static SPA (Vite build output — HTML/CSS/JS + local assets) with no backend of its own: the browser talks directly to `stream.radiojar.com` for audio and, later, to `mp3quran.net` for the optional stations feature. Cloudflare Pages is a good fit as static hosting; deploying by hand from the dashboard (no CI/CD wiring) works fine for this project's size.

**Build output to upload:**
- Run `pnpm --filter web build` locally → produces `packages/web/dist/`.
- In the Cloudflare Pages dashboard: **Create a project → Upload assets** (direct upload), and drag in the contents of `packages/web/dist/`. Repeat per release — there's no git-connected auto-build since deploys are manual.

**Project settings to set in the dashboard:**
- **Build output directory**: `dist` (only relevant if a git-connected build is used instead of direct upload — not needed for the manual-upload flow, but worth knowing if that's switched on later).
- **SPA fallback routing**: add a `_redirects` file to `packages/web/public/` (so Vite copies it into `dist/` automatically) containing:
  ```
  /* /index.html 200
  ```
  This isn't strictly required for a single-route player UI, but costs nothing and avoids a 404 if deep-linking or additional routes (e.g. `/en`, `/ar`) get added later.
- **Custom domain**: attach under the project's *Custom domains* tab once one is chosen; Cloudflare issues/renews the TLS cert automatically.
- **Caching**: static assets (JS/CSS with hashed filenames from the Vite build) are safe to cache aggressively — Cloudflare Pages does this by default. `index.html` should stay short-cache/no-cache so new deploys are picked up promptly; this is Pages' default behavior, no extra config needed.

**No server-side proxy needed for the stream:** since the RadioJar URL (§0/§4) is fetched directly by the `<audio>` element client-side, Cloudflare Pages never touches the audio bytes — it only serves the static app shell. No CORS configuration is needed on the Pages side.

**Desktop/mobile are unaffected** — Tauri and React Native ship as native binaries/app-store builds, not through Cloudflare Pages; only the `packages/web` output is hosted there.

---

## 7. Mobile implementation (React Native)

1. `expo install expo-av` (simplest path) **or** `react-native-track-player` if lock-screen transport controls + background service are required from day one (recommended, since "radio app" implies exactly this).
2. Permissions:
   - iOS: `UIBackgroundModes: ["audio"]` in `Info.plist`.
   - Android: `FOREGROUND_SERVICE`, `WAKE_LOCK` in `AndroidManifest.xml`; target-SDK-appropriate foreground service type (`mediaPlayback`) for Android 14+.
3. Register a `TrackPlayer` playback service once at app entry; feed it `PRIMARY_STREAM` from `packages/core` — same resolver logic as web (no duplicated stream-selection code).
4. Lock-screen metadata: title/artist from `PRIMARY_STREAM.name[locale]`, artwork from the bundled local asset (same reasoning as §5 — don't depend on a remote image for lock-screen display).
5. Handle interruptions (phone calls, other audio apps) via `TrackPlayer` events; resume-on-interruption-end should be opt-in, not automatic (avoid a jarring surprise resume).

---

## 8. Internationalization & RTL

- Two locales: `ar` (default, RTL) and `en` (LTR). Persist choice (localStorage on web, AsyncStorage on mobile).
- Web: toggle `dir="rtl"|"ltr"` and `lang` on `<html>` root when locale changes; Tailwind's logical properties (`ms-*`/`me-*` instead of `ml-*`/`mr-*`) avoid needing separate RTL stylesheets.
- Mobile: `I18nManager.forceRTL()` requires an app reload to take effect on native — surface a "restart to apply" notice rather than silently failing to mirror layout.
- Keep all user-facing strings in `packages/core/src/i18n/{ar,en}.json`, imported by both web and mobile — no per-platform string duplication.

---

## 9. Testing strategy

- `packages/core`: unit tests (Vitest) for `streamResolver`'s retry/backoff state machine and `mp3quran.ts` response parsing (mock fetch, including the corrected `{radios: [...]}` shape).
- `packages/web`: component test for offline-state rendering (external links shown) and locale/RTL switch.
- `packages/mobile`: manual test pass on a real device for background audio + lock-screen controls (simulators are unreliable for background audio behavior).
- Before any release: manually confirm the primary stream URL is still live — live streams do go stale; this is a recurring manual check, not something CI can catch.
- After every manual Cloudflare Pages deploy (§6): load the live URL and confirm playback actually starts — a static-hosting deploy can silently ship a broken build (e.g. stale cached `index.html` referencing a deleted JS chunk) that only shows up on the hosted URL, not in local dev.

---

## 10. Phased roadmap

**Phase 0 — Unblock (must finish first)** ✅ done
- ✅ Real Quran FM 98.2 stream URL confirmed: `https://stream.radiojar.com/8s5u5tpdtwzuv` (see §0/§4).
- ✅ pnpm monorepo skeleton set up (`packages/core`, `packages/web` fully built; `packages/mobile`, `src-tauri/` are placeholder READMEs pending Phase 2/3).
- ⚠️ Still open: smoke-test actual playback in a real `<audio>` element under real network conditions and on a physical mobile device — the `curl` verification (§0) confirms the bytes are live audio, not that every browser/OS handles the mid-stream 302 + short-TTL token identically (buffering/reconnect behavior). The dev-build smoke test done so far (§12) only confirmed the app compiles and serves; it did not confirm audio actually plays in a real browser.

**Phase 1 — Web MVP** ✅ done
- ✅ `streamResolver` + `PRIMARY_STREAM` in `core`, unit-tested.
- ✅ Web player UI (play/pause, loading, offline state with external links), bilingual strings, RTL toggle.
- ⬜ First manual deploy to Cloudflare Pages (§6) — not done yet, no build has been uploaded.

**Phase 2 — Desktop** — not started
- Wrap the web build in Tauri; verify audio playback and window packaging on Windows (primary dev platform here). Only a placeholder `src-tauri/README.md` exists.

**Phase 3 — Mobile** — not started
- RN app with `react-native-track-player`, background audio, lock-screen metadata, bilingual/RTL. Only a placeholder `packages/mobile/README.md` exists.

**Phase 4 — Polish / stretch**
- MP3Quran "browse other stations" feature using the corrected API client (client exists in `core` and is unit-tested, but no UI consumes it yet).
- Equalizer visuals (✅ CSS-only bars shipped in `EqualizerBars.tsx`), theming, system-tray controls on desktop.

---

## 11. Open questions

- Is Tauri acceptable, or is Electron required for a specific target (e.g. an existing internal build pipeline)? Defaulting to Tauri above for size/perf; flag if that's wrong.
- Should locale default follow system language, or always default to Arabic given the station's primary audience? Defaulting to Arabic-first above.
- Confirm whether `react-native-track-player` (heavier setup, native lock-screen controls) or `expo-av` (simpler, weaker background/lock-screen support) is the right tradeoff for v1 — leaning `react-native-track-player` per §6 since lock-screen controls are a core expectation for a radio app.

---

## 12. Implementation status (2026-09-20)

Phase 0 and Phase 1 are built. This section records what actually exists, deviations from the original plan, and how to run it — update it as later phases land instead of trusting §10's checkmarks alone to stay current.

**What's implemented:**
- `packages/core` (`@quran-fm/core`): `streams.ts`, `streamResolver.ts` (+ tests), `mp3quran.ts` (+ tests), `i18n/{ar,en}.json` + `i18n/index.ts`. All framework-agnostic, no DOM/React deps.
- `packages/web` (`@quran-fm/web`): Vite + React 19 + TypeScript + Tailwind CSS v4 (via `@tailwindcss/vite`, not a PostCSS config). `EnhancedPlayer` card with play/pause, CSS-animated equalizer bars, bilingual `LocaleContext` (persists to `localStorage`, toggles `<html dir>`/`lang`), offline state rendering `EXTERNAL_LISTEN_LINKS`. `public/_redirects` present for the Cloudflare Pages SPA fallback (§6). Local `station-artwork.svg` used directly — no remote image / `onError` swap needed since there's no remote source to begin with.
- `packages/mobile` and `src-tauri`: placeholder `README.md` only, per Phase 2/3 scope — not built.

**Deviations from the original plan:**
- `mp3quran.ts` is not re-exported as a "browse stations" UI feature — only the API client + its tests exist, as scoped for Phase 1.
- `streamResolver` takes an injected `AudioAdapter` interface (see §4) rather than a bare `onStateChange` callback, so the resolver logic can be reused by a future RN adapter — this is a superset of the original sketch, not a scope change.
- Package manager: pnpm was not preinstalled in this environment and was installed via `npm install -g pnpm` (approved `esbuild`'s postinstall script through `pnpm approve-builds` / `pnpm-workspace.yaml`'s `allowBuilds`).

**Verification performed:**
- `pnpm --filter @quran-fm/core test` — 7/7 passing (resolver state machine + mp3quran parsing).
- `pnpm --filter @quran-fm/web test` — 3/3 passing (offline-links rendering, locale/RTL toggle).
- `pnpm --filter @quran-fm/web build` — production build succeeds (`tsc -b && vite build`).
- Dev server (`pnpm --filter @quran-fm/web dev`) smoke-tested via HTTP: `index.html`, `main.tsx`, `App.tsx`, and `station-artwork.svg` all serve/transform without error.
- **Not yet verified:** actual audio playback in a real browser (no browser automation tool was available in this session) — see the Phase 0 open item above. Before shipping, manually open the dev server and confirm the RadioJar stream plays and the retry/offline UI behaves as expected on a flaky connection.

**How to run:**
```sh
pnpm install
pnpm --filter @quran-fm/core test
pnpm --filter @quran-fm/web test
pnpm --filter @quran-fm/web dev     # http://localhost:5173
pnpm --filter @quran-fm/web build   # outputs packages/web/dist/ for Cloudflare Pages (§6)
```

---

## Appendix — original UI reference snippets

The visual direction sketched in the earlier notes (emerald/gold glassmorphism card, CSS-animated equalizer bars, mobile card layout) was the starting design for `packages/web/src/player/EnhancedPlayer.tsx` (see §12) — implemented there wired to `usePlayer()`/`useStreamResolver()` instead of a hardcoded `<audio src>`/image URL. The original code samples from these notes weren't preserved as-is; the JSX was re-derived from this plan's descriptions in §5/§6 against the corrected APIs.
