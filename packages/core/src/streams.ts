export interface StationName {
  ar: string;
  en: string;
}

export interface Station {
  id: string;
  name: StationName;
  /**
   * 302-redirects to a short-lived tokenized RadioJar edge node (rj-ttl=5s).
   * DO NOT resolve-and-cache the redirect target — always hit this URL fresh
   * and let the HTTP client follow the redirect on every (re)connect.
   * Verified live against holyquranradio.com & surahquran.com embeds — see docs/App-dev.md §0.
   */
  url: string;
}

export const PRIMARY_STREAM: Station = {
  id: 'quran-fm-982-cairo',
  name: { ar: 'إذاعة القرآن الكريم من القاهرة', en: 'Quran FM 98.2 — Cairo' },
  url: 'https://stream.radiojar.com/8s5u5tpdtwzuv',
};

export interface ExternalListenLink {
  label: string;
  url: string;
}

export const EXTERNAL_LISTEN_LINKS: ExternalListenLink[] = [
  { label: 'Holy Quran Radio', url: 'https://www.holyquranradio.com/' },
  { label: 'Surah Quran (Cairo)', url: 'https://surahquran.com/Radio-Quran-Cairo.html' },
  { label: 'Radio Garden', url: 'https://radio.garden/listen/quran-fm-98-2-idhaet-alqran-alkrym/GQxvGBNK' },
];
