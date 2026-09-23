# SEO Improvements

Status of each item from the original audit, plus what was implemented and where.

## Technical SEO & Metadata

- [x] **Title tag** — Updated in [index.html](../packages/web/index.html#L19) to
  `بث مباشر إذاعة القرآن الكريم من القاهرة 98.2 FM | Quran Radio Live`.
- [x] **Meta description** — Already present in Arabic in
  [index.html](../packages/web/index.html#L21-L24), summarizing the live stream and station.
- [x] **Open Graph tags** — `og:type`, `og:site_name`, `og:title`, `og:description`, `og:url`,
  `og:image`, `og:locale` are all set in [index.html](../packages/web/index.html#L30-L39), plus a
  matching Twitter card block, so share links from the existing share buttons render rich previews.
  - Note: `og:image`/`twitter:image` currently point to `station-artwork.svg`. SVG OG images have
    inconsistent support on some platforms (notably X/Twitter and LinkedIn) — consider adding a
    PNG/JPG fallback (e.g. 1200×630) if rich previews don't render correctly there.
- [x] **Accessibility (a11y)** — The play/pause button in
  [EnhancedPlayer.tsx](../packages/web/src/player/EnhancedPlayer.tsx#L48) has a localized
  `aria-label` (`t('play')` / `t('pause')`, i.e. "تشغيل"/"إيقاف" or "Play"/"Pause") rather than a
  hardcoded string — this is intentional since the label should match the announced document
  language for AR/EN visitors. The station logo `<img>` now uses a descriptive, localized
  `alt` via `t('stationLogoAlt')` instead of just repeating the station name.

## Content Expansion

- [x] **Text context section** — Added a new `<StationInfo>` component
  ([StationInfo.tsx](../packages/web/src/player/StationInfo.tsx)), rendered below the player card
  in [EnhancedPlayer.tsx](../packages/web/src/player/EnhancedPlayer.tsx). It covers the station's
  history, its 98.2 FM frequency/reception, and the programs/recitations broadcast, in both Arabic
  and English via the existing i18n dictionaries
  ([ar.json](../packages/core/src/i18n/ar.json), [en.json](../packages/core/src/i18n/en.json)).
- [x] **Semantic HTML** — The main station name was already wrapped in `<h1>`
  ([EnhancedPlayer.tsx](../packages/web/src/player/EnhancedPlayer.tsx#L36)). The new
  `StationInfo` section adds `<h2>` headings for each sub-topic (history, frequency, programs).

## Off-Page Authority

- [ ] **Backlinks** — Not a code change; share the URL on relevant Islamic forums, social media
  groups, and directories to build authority (manual/marketing task, not implemented here).

## Core Web Vitals

- [x] **Audio playback doesn't block the main thread** — Already the case before this pass:
  `usePlayer.ts` creates the `Audio` element inside a `useEffect` with `preload="none"`, so no
  network/stream fetch happens until the user presses play, and it never blocks initial render.
- [x] **Reduce main-bundle weight for faster FCP** — `StatsDashboard` (and its chart library) was
  being eagerly bundled into the main chunk even though most visitors only ever see the player.
  It's now code-split via `React.lazy`/`Suspense` in [App.tsx](../packages/web/src/App.tsx), so it
  only loads when a visitor navigates to `/stats`.
  - Remaining opportunity: Google Fonts are loaded via a render-blocking `<link rel="stylesheet">`
    in [index.html](../packages/web/index.html#L13-L18) (with `preconnect` hints and
    `display=swap` already in place). Self-hosting the fonts would remove this last
    render-blocking request if FCP still needs improvement.
