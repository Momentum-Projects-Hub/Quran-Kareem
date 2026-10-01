export interface StationName {
  ar: string;
  en: string;
}

export interface Station {
  id: string;
  name: StationName;
  /**
   * Stream URLs in priority order. The resolver plays the first one that works
   * and fails over to the next; always hit these fresh on every (re)connect and
   * never resolve-and-cache a redirect target.
   */
  urls: string[];
}

/**
 * Official Egyptian Quran Radio live stream (HLS), taken from the `radio_stream`
 * entry on misrquran.gov.eg. Its CDN sends CORS headers, so browsers can play it
 * directly via hls.js / native HLS.
 */
export const OFFICIAL_HLS_STREAM_URL =
  'https://service.webvideocore.net/CL1olYogIrDWvwqiIKK7eCxOS4PStqG9DuEjAr2ZjZQtvS3d4y9r0cvRhvS17SGN/a_7a4vuubc6mo8.m3u8';

/**
 * 302-redirects to a short-lived tokenized RadioJar edge node (rj-ttl=5s).
 * Verified live against holyquranradio.com & surahquran.com embeds — see docs/App-dev.md §0.
 */
export const RADIOJAR_STREAM_URL = 'https://stream.radiojar.com/8s5u5tpdtwzuv';

export const PRIMARY_STREAM: Station = {
  id: 'quran-fm-982-cairo',
  name: { ar: 'إذاعة القرآن الكريم من القاهرة', en: 'Quran FM 98.2 — Cairo' },
  urls: [OFFICIAL_HLS_STREAM_URL, RADIOJAR_STREAM_URL],
};

export function isHlsUrl(url: string): boolean {
  return /\.m3u8($|\?)/i.test(url);
}

export interface ExternalListenLink {
  label: string;
  url: string;
}

export const EXTERNAL_LISTEN_LINKS: ExternalListenLink[] = [
  // Official Egyptian Quran Radio site — first choice when our stream is down.
  { label: 'Misr Quran (Official)', url: 'https://s.misrquran.gov.eg/EabeT3p' },
  { label: 'Holy Quran Radio', url: 'https://www.holyquranradio.com/' },
  { label: 'Surah Quran (Cairo)', url: 'https://surahquran.com/Radio-Quran-Cairo.html' },
  { label: 'Radio Garden', url: 'https://radio.garden/listen/quran-fm-98-2-idhaet-alqran-alkrym/GQxvGBNK' },
];
