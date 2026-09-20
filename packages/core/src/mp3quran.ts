/**
 * Generic MP3Quran "other stations" client. Separate feature, not used to
 * resolve Quran FM 98.2 Cairo — that station isn't in this API's dataset.
 * See docs/App-dev.md §0.
 */

export interface Radio {
  id: number;
  name: string;
  url: string;
  recent_date: string;
}

interface RadiosResponse {
  radios: Radio[];
}

const MP3QURAN_RADIOS_ENDPOINT = 'https://www.mp3quran.net/api/v3/radios';

export async function fetchAllRadios(): Promise<Radio[]> {
  const res = await fetch(MP3QURAN_RADIOS_ENDPOINT);
  if (!res.ok) throw new Error(`MP3Quran API error: ${res.status}`);
  const data = (await res.json()) as RadiosResponse;
  return data.radios;
}
