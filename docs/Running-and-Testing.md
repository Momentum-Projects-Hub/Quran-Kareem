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

Runs `tsc -b && vite build`, producing static output in `packages/web/dist/` (this is also what Cloudflare Pages builds via the GitHub-connected pipeline — see below and [App-dev.md §6](./App-dev.md#6-web-hosting--cloudflare-pages-github-connected)).

To sanity-check the production build locally:

```sh
pnpm --filter @quran-fm/web preview
```

### Desktop / Mobile

Not yet implemented (Phase 2/3). `src-tauri/README.md` and `packages/mobile/README.md` are placeholders only — nothing to run there yet.

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
