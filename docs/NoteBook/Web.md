# Quran FM 98.2 (Cairo) — Web App

Bilingual (Arabic/English) web player streaming إذاعة القرآن الكريم من القاهرة — Quran FM 98.2 — built as a static single-page app.

Status as of 2026-09-20: implemented and functioning (Phase 1 + Phase 1.1 complete).

---

## What it is

A single-station live radio player for the web. It is intentionally small in scope: one core playback experience, not a station directory or browsing app.

- Bilingual UI: Arabic (RTL, default) and English (LTR), instantly switchable, persisted across sessions.
- Resilient playback: a hardcoded primary stream with automatic retry/backoff, falling back to a clear "station offline" state with outbound links to alternate listening sources — never a silently dead button.
- Lock-screen/media-key metadata support via the standard browser MediaSession API.

**Non-goals:** account systems, offline downloads/DVR, multi-station browsing as a first-class feature, push notifications, analytics dashboards.

---

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | React 19 + Vite + TypeScript | Fast dev loop |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`, not PostCSS) | Utility-first styling, RTL-friendly logical properties (`ms-*`/`me-*`) |
| Shared logic | `@quran-fm/core` (workspace package) | Stream resolution, i18n strings, types — shared with desktop (via this same build) and mobile |
| State | React hooks + Context (`usePlayer`, `useLocale`) | App is small enough that Redux/Zustand would be unnecessary overhead |
| i18n | Minimal custom dictionary (`packages/core/src/i18n`) | Two locales, ~10 keys — no need for `react-i18next` |
| Hosting | Cloudflare Pages, GitHub-connected CI/CD | Free static hosting, global CDN, auto-deploy on push to `main`, PR preview URLs |
| Package manager | pnpm workspaces (monorepo) | Shared `core` package used by web, desktop, and mobile without version drift |

The web build (`packages/web/dist`) is also the exact artifact the desktop app (Electron) wraps — there is only one web codebase.

---

## Stream resolution

The real Cairo 98.2 stream, verified by inspecting the embedded players on `holyquranradio.com` and `surahquran.com`, is:

```
https://stream.radiojar.com/8s5u5tpdtwzuv
```

This URL 302-redirects to a short-lived tokenized RadioJar edge node (`rj-ttl=5` — valid only a few seconds). **The app must always point the `<audio>` element at the public URL above and let the browser follow the redirect on every connection attempt** — never resolve-and-cache the redirected edge URL, since it will have expired by the time it's reused.

Playback resolution order:

1. **Primary hardcoded stream** — the only confirmed-real source for this station.
2. **Health check + retry** — on `error`/`stalled` audio events, retry with backoff (2s / 5s / 10s across 3 attempts). Live streams drop connections transiently; the app doesn't fail over on the first hiccup.
3. **Offline state** — after retries exhaust, show "station temporarily unavailable" with outbound links (not embedded audio) to:
   - Holy Quran Radio — `https://www.holyquranradio.com/`
   - Surah Quran (Cairo) — `https://surahquran.com/Radio-Quran-Cairo.html`
   - Radio Garden — `https://radio.garden/listen/quran-fm-98-2-idhaet-alqran-alkrym/GQxvGBNK` (browser-embed widget only, never used as a direct audio source)

This retry/backoff/offline state machine lives in the framework-agnostic `@quran-fm/core` package (`streamResolver.ts`) and is driven here through an `HTMLAudioElement`-backed adapter (`packages/web/src/player/audioAdapter.ts`), so the exact same logic is reused unmodified by mobile.

An MP3Quran API client (`mp3quran.ts`) exists in `core` as a separate, optional "browse other Quran stations" feature — it is **not** part of this station's fallback chain, and no UI currently consumes it (Phase 4 backlog item).

---

## Implementation details

- `EnhancedPlayer` — main player card UI: frosted-glass/glassmorphism card (`border-white/10` + `bg-white/5` + `backdrop-blur-xl`), CSS-only animated equalizer bars (no `AudioContext`/CORS complexity), pulsing play button while audio is active.
- `preload="none"` on the `<audio>` element — live streams must never eagerly buffer.
- Fonts: Google Fonts `Cairo`/`Tajawal`, applied via `body`/`:lang(en)` CSS rules for legible Arabic typography.
- Language toggle: a fixed globe (🌐) icon button in the top corner (RTL-aware via logical `end-*` positioning).
- `ShareButtons.tsx`: Facebook, WhatsApp, and Telegram share links, plus a native Web Share API button (covers Instagram and other mobile share targets that don't support direct URL sharing).
- Local bundled artwork (`public/station-artwork.svg`) — no hotlinked remote image, so an external image host going down can't break the UI.
- `LocaleContext.tsx`: persists locale to `localStorage`, toggles `dir`/`lang` attributes on `<html>` when locale changes.
- MediaSession API (`navigator.mediaSession.metadata` / `setActionHandler`) wired in `usePlayer.ts` — gives lock-screen/media-key controls on both desktop OSes (via Electron's embedded Chromium) and plain browser tabs, with zero platform-specific code.
- `window.desktop` is `undefined` in a plain browser tab (only defined when wrapped by the Electron shell), so this is a single shared build across web and desktop.

---

## Hosting: Cloudflare Pages

The app is a pure static SPA with no backend — the browser talks directly to `stream.radiojar.com` for audio. Deployed via Cloudflare Pages, GitHub-connected to `Momentum-Projects-Hub/Quran-Kareem`.

**Project settings:**
| Setting | Value |
|---|---|
| Root directory | `/` (repo root — **not** `packages/web`, so `pnpm install` can resolve the `@quran-fm/core` workspace dependency) |
| Build command | `pnpm --filter @quran-fm/web build` |
| Build output directory | `packages/web/dist` |
| Production branch | `main` |

- SPA fallback routing: `packages/web/public/_redirects` contains `/* /index.html 200` (copied into `dist/` by the Vite build).
- Custom domain: attach under the project's *Custom domains* tab; Cloudflare auto-issues/renews TLS.
- Caching: hashed JS/CSS assets cached aggressively by default; `index.html` stays low/no-cache automatically.
- No environment variables required for the app itself; set `NODE_VERSION` or pin a `packageManager` field if the auto-detected pnpm version mismatches.
- No server-side proxy for the stream — Cloudflare Pages only ever serves the static app shell.

---

## Running locally

```sh
pnpm install
pnpm --filter @quran-fm/web dev       # http://localhost:5173
pnpm --filter @quran-fm/web build     # -> packages/web/dist/
pnpm --filter @quran-fm/web preview   # sanity-check the production build locally
pnpm --filter @quran-fm/web lint      # oxlint
```

Root shortcuts: `pnpm dev:web`, `pnpm build:web`.

---

## Testing

Vitest + Testing Library (jsdom):

```sh
pnpm --filter @quran-fm/web test
```

Covers: offline-state rendering (external listen links shown) and the locale/RTL toggle. `@quran-fm/core`'s own tests cover the shared `streamResolver` retry/backoff state machine and `mp3quran.ts` response parsing.

**Not covered by automated tests** — verify manually:
1. Stream actually plays (press play, confirm real audio from `stream.radiojar.com/8s5u5tpdtwzuv`).
2. Offline/retry behavior (throttle/disconnect network, confirm backoff retries then the offline state with external links appears).
3. Locale/RTL toggle (switch AR/EN, confirm `dir`/`lang` flip and layout mirrors).
4. After every Cloudflare Pages deploy: load the **live hosted URL** (not just localhost) and confirm playback starts — a build can succeed while shipping a stale/broken deploy.

---

## Known gaps / open items

- Actual audio playback in a real browser under real network conditions has not been smoke-tested in the environment this was built in — the stream URL was verified via `curl`, confirming the bytes are live audio, but not every browser's handling of the mid-stream 302 + short-TTL token.
- No UI yet for the "browse other Quran stations" MP3Quran feature (client + tests exist, unused).
