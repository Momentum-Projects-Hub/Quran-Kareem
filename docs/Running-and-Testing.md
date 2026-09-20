# Running & Testing Quran FM 98.2

Practical guide for getting the app running locally and exercising its tests. For architecture, stream-resolution rationale, and the phased roadmap, see [App-dev.md](./App-dev.md).

Currently only `packages/core` and `packages/web` are implemented. `src-tauri/` (desktop) and `packages/mobile/` (mobile) are placeholder READMEs — see [App-dev.md §10](./App-dev.md#10-phased-roadmap).

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

Opens the Vite dev server at **http://localhost:5173**. This is the only runnable target today — the player card, play/pause, bilingual (AR/EN) toggle, and offline-state fallback links are all live here.

### Production build (web)

```sh
pnpm --filter @quran-fm/web build
```

Or:

```sh
pnpm build:web
```

Runs `tsc -b && vite build`, producing static output in `packages/web/dist/` (deployable to Cloudflare Pages — see [App-dev.md §6](./App-dev.md#6-web-hosting--cloudflare-pages-manual-dashboard-deploy)).

To sanity-check the production build locally:

```sh
pnpm --filter @quran-fm/web preview
```

### Desktop / Mobile

Not yet implemented (Phase 2/3). `src-tauri/README.md` and `packages/mobile/README.md` are placeholders only — nothing to run there yet.

---

## Testing

### Run everything

```sh
pnpm test
```

Runs `test` in every workspace package (`pnpm -r test`) — currently `@quran-fm/core` and `@quran-fm/web`.

### Run a single package's tests

```sh
pnpm --filter @quran-fm/core test
pnpm --filter @quran-fm/web test
```

**`@quran-fm/core`** (Vitest): covers `streamResolver`'s retry/backoff state machine (success path, retry-then-succeed, exhaust-retries-to-offline, `stop()` cancelling pending retries) and `mp3quran.ts` response parsing against the corrected `{ radios: [...] }` shape.

**`@quran-fm/web`** (Vitest + Testing Library, jsdom): covers offline-state rendering (external listen links shown) and the locale/RTL toggle.

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

---

## Troubleshooting

- **pnpm not found**: install globally with `npm install -g pnpm`, then re-run `pnpm install`.
- **Postinstall/build script blocked**: run `pnpm approve-builds` and allow `esbuild` (already declared in `pnpm-workspace.yaml`, but pnpm may still prompt on a fresh machine).
- **Port 5173 already in use**: stop whatever else is using it, or pass `--port` to the dev script: `pnpm --filter @quran-fm/web dev -- --port 5174`.
- **No audio in dev, no console errors**: check for browser autoplay restrictions — the player requires a user gesture (clicking play) before audio can start; this is expected browser behavior, not a bug.
