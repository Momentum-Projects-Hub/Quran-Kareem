import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAllRadios } from './mp3quran.js';

describe('fetchAllRadios', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses the object-wrapped {radios: [...]} shape', async () => {
    const radios = [{ id: 1, name: 'Test Radio', url: 'https://example.com/stream', recent_date: '2026-01-01' }];
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ radios }),
      }),
    );

    const result = await fetchAllRadios();

    expect(result).toEqual(radios);
    expect(fetch).toHaveBeenCalledWith('https://www.mp3quran.net/api/v3/radios');
  });

  it('throws on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(fetchAllRadios()).rejects.toThrow('MP3Quran API error: 500');
  });
});
