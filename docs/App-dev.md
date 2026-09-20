# Quran FM 98.2 (Cairo) — Implementation Plan

Bilingual (Arabic/English) web, desktop, and mobile app streaming إذاعة القرآن الكريم من القاهرة — Quran FM 98.2.

> This document supersedes the earlier research notes. Corrections found during verification are called out in **Section 0** because they change the architecture.

> **Status (2026-09-20):** Phase 0, Phase 1, and Phase 1.1 (UI/UX polish) are implemented — see **Section 12**. Phase 2 (desktop) and Phase 3 (mobile) are stubs only.

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
| Web hosting | Cloudflare Pages, deployed via GitHub-connected CI/CD | Free static hosting, global CDN, no server needed — the app is a pure static SPA that talks directly to `stream.radiojar.com` from the client. Auto-deploys on push to `main`, PR preview URLs for free. See §6 |

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

## 6. Web hosting — Cloudflare Pages (GitHub-connected)

The web app is a pure static SPA (Vite build output — HTML/CSS/JS + local assets) with no backend of its own: the browser talks directly to `stream.radiojar.com` for audio and, later, to `mp3quran.net` for the optional stations feature. Cloudflare Pages is a good fit as static hosting. Deploys are wired to the `Momentum-Projects-Hub/Quran-Kareem` GitHub repo — push to `main` auto-deploys production, other branches/PRs get their own preview URL.

**Cloudflare Pages project settings** (Workers & Pages → Create application → Pages → Connect to Git):
- **Root directory**: repo root (`/`), *not* `packages/web` — the pnpm workspace needs the root `pnpm-lock.yaml`/`pnpm-workspace.yaml` in scope so `pnpm install` can resolve the `@quran-fm/core` workspace dependency.
- **Build command**: `pnpm --filter @quran-fm/web build` — Cloudflare auto-runs `pnpm install` first since it detects `pnpm-lock.yaml` at the root.
- **Build output directory**: `packages/web/dist`.
- **Production branch**: `main`.

**SPA fallback routing**: `packages/web/public/_redirects` (copied into `dist/` automatically by the Vite build) contains:
```
/* /index.html 200
```
This isn't strictly required for a single-route player UI, but costs nothing and avoids a 404 if deep-linking or additional routes (e.g. `/en`, `/ar`) get added later.

**Other dashboard settings:**
- **Custom domain**: attach under the project's *Custom domains* tab once one is chosen; Cloudflare issues/renews the TLS cert automatically.
- **Caching**: static assets (JS/CSS with hashed filenames from the Vite build) are safe to cache aggressively — Cloudflare Pages does this by default. `index.html` should stay short-cache/no-cache so new deploys are picked up promptly; this is Pages' default behavior, no extra config needed.
- **Environment variables**: none required for the app itself. If the auto-detected Node/pnpm version mismatches, set `NODE_VERSION` explicitly or pin via a `packageManager` field in the root `package.json`.

**No server-side proxy needed for the stream:** since the RadioJar URL (§0/§4) is fetched directly by the `<audio>` element client-side, Cloudflare Pages never touches the audio bytes — it only serves the static app shell. No CORS configuration is needed on the Pages side.

See [Running-and-Testing.md](./Running-and-Testing.md) for the full step-by-step dashboard walkthrough.

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
- ✅ First manual deploy to Cloudflare Pages (§6) — not done yet, no build has been uploaded. 

**Phase 1.1 — UI/UX polish** ✅ done
- ✅ Glassmorphism card: `border-white/10` + `bg-white/5` + `backdrop-blur-xl` on `EnhancedPlayer`'s card (`packages/web/src/player/EnhancedPlayer.tsx`).
- ✅ Typography: Google Fonts `Cairo`/`Tajawal` loaded in `packages/web/index.html`, applied via `body`/`:lang(en)` rules in `packages/web/src/index.css`; secondary status text brightened to `text-white/70`.
- ✅ Play button pulse: `.animate-pulse-ring` keyframes in `index.css`, applied to the play/pause button only while `isPlaying`.
- ✅ Language toggle: moved to a fixed globe (`🌐`) icon button in the screen's top-right/top-start corner (`end-4 top-4`, RTL-aware via logical `end-*`), accessible name still comes from `t('language')` via `aria-label`/`title` so existing tests keep passing unchanged.
- ✅ Social share buttons: new `packages/web/src/player/ShareButtons.tsx` — Facebook/WhatsApp/Telegram links plus a native Web Share API button (`navigator.share`) as the "more options" affordance covering Instagram/mobile share sheets. New i18n keys `share`/`shareMore` added to `packages/core/src/i18n/{ar,en}.json`. `shareUrl` is read from `window.location.href` at click time rather than hardcoded.

Below is the original recommendation writeup that drove this phase, kept for reference.

Here are specific recommendations to elevate the current UI/UX, along with a React/JSX-friendly implementation for the social share buttons.

### UI/UX Improvement Recommendations

* **Glassmorphism Card Effect:** The current solid dark green card blends too much into the background. Replace it with a frosted glass effect (`backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);`) to create depth and modern appeal.
* **Typography:** The Arabic text feels slightly cramped. Use a modern, highly legible font like **'Cairo'** or **'Tajawal'** from Google Fonts. Increase the brightness of the secondary text ("بث مباشر — القاهرة 98.2") to `rgba(255, 255, 255, 0.7)` for better contrast.
* **Play Button Animation:** Add a subtle CSS "pulse" or "ripple" animation to the orange play button when the audio is active. This visually reinforces the "Live Broadcast" status.
* **Language Toggle Placement:** The "English" button currently floats in the top-left of the card. Move it to the top-right corner of the *entire screen* or right-align it within the card's header, and replace the text with a simple Globe icon (`🌐`) for a cleaner look.

### Social Share Buttons Implementation

Instagram does not support a direct web-based URL sharing mechanism like Facebook or Telegram. The most modern UX approach is to use the native **Web Share API** for mobile users (which opens the native iOS/Android share sheet including Instagram), alongside custom buttons for desktop.

Here is a responsive implementation you can drop into your React/Vite project:

```jsx
import React from 'react';

const ShareButtons = () => {
  const shareUrl = "https://your-live-url.com"; // Replace with actual URL
  const shareText = "استمع إلى إذاعة القرآن الكريم من القاهرة 98.2";

  // Native mobile share (covers Instagram, WhatsApp, etc. on mobile)
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Quran FM 98.2',
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      alert("Web Share API is not supported in your browser.");
    }
  };

  return (
    <div className="flex flex-col items-center mt-6 gap-3">
      <span className="text-sm text-white/60">شارك الإذاعة</span>
      
      <div className="flex gap-4">
        {/* Facebook */}
        <a 
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-[#1877f2] hover:opacity-80 transition-opacity"
          title="Share on Facebook"
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
        </a>

        {/* WhatsApp */}
        <a 
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + shareUrl)}`}
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-[#25d366] hover:opacity-80 transition-opacity"
          title="Share on WhatsApp"
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.347-.272.297-1.04 1.016-1.04 2.479 0 1.463 1.065 2.876 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
        </a>

        {/* Telegram */}
        <a 
          href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
          target="_blank" 
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-[#0088cc] hover:opacity-80 transition-opacity"
          title="Share on Telegram"
        >
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.686c.223-.198-.054-.31-.346-.11l-6.4 4.024-2.76-.86c-.6-.188-.61-.6.126-.89l10.79-4.16c.49-.187.92.117.75.922z"/></svg>
        </a>

        {/* Native Web Share (Best for Mobile & Instagram) */}
        <button 
          onClick={handleNativeShare}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/20"
          title="More Share Options"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
        </button>
      </div>
    </div>
  );
};

export default ShareButtons;

```



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

Phase 0, Phase 1, and Phase 1.1 are built. This section records what actually exists, deviations from the original plan, and how to run it — update it as later phases land instead of trusting §10's checkmarks alone to stay current.

**What's implemented:**
- `packages/core` (`@quran-fm/core`): `streams.ts`, `streamResolver.ts` (+ tests), `mp3quran.ts` (+ tests), `i18n/{ar,en}.json` + `i18n/index.ts`. All framework-agnostic, no DOM/React deps.
- `packages/web` (`@quran-fm/web`): Vite + React 19 + TypeScript + Tailwind CSS v4 (via `@tailwindcss/vite`, not a PostCSS config). `EnhancedPlayer` card with play/pause, CSS-animated equalizer bars, bilingual `LocaleContext` (persists to `localStorage`, toggles `<html dir>`/`lang`), offline state rendering `EXTERNAL_LISTEN_LINKS`. `public/_redirects` present for the Cloudflare Pages SPA fallback (§6). Local `station-artwork.svg` used directly — no remote image / `onError` swap needed since there's no remote source to begin with.
- Phase 1.1 UI/UX polish (see §10): frosted-glass card, `Cairo`/`Tajawal` Google Fonts, pulsing play button, globe-icon language toggle fixed to the screen corner, and `ShareButtons.tsx` (Facebook/WhatsApp/Telegram links + native Web Share API).
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
