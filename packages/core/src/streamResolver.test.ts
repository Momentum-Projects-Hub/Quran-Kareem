import { describe, expect, it, vi } from 'vitest';
import { createStreamResolver, type AudioAdapter, type StreamState } from './streamResolver.js';
import { RADIOJAR_STREAM_URL, OFFICIAL_HLS_STREAM_URL, type Station } from './streams.js';

const SINGLE: Station = { id: 'single', name: { ar: 'x', en: 'x' }, urls: ['https://a.example/stream'] };

function flushScheduled(scheduled: Array<() => void>) {
  const toRun = scheduled.splice(0, scheduled.length);
  toRun.forEach((fn) => fn());
}

describe('createStreamResolver', () => {
  it('transitions idle -> loading -> playing on success', async () => {
    const adapter: AudioAdapter = { play: vi.fn().mockResolvedValue(undefined), stop: vi.fn() };
    const states: StreamState[] = [];
    const resolver = createStreamResolver({ adapter, onStateChange: (s) => states.push(s) });

    await resolver.play();

    expect(states).toEqual(['loading', 'playing']);
    expect(resolver.getState()).toBe('playing');
    expect(adapter.play).toHaveBeenCalledTimes(1);
  });

  it('retries with backoff on failure, then succeeds', async () => {
    let calls = 0;
    const adapter: AudioAdapter = {
      play: vi.fn().mockImplementation(() => {
        calls += 1;
        return calls < 3 ? Promise.reject(new Error('fail')) : Promise.resolve();
      }),
      stop: vi.fn(),
    };
    const scheduled: Array<() => void> = [];
    const states: StreamState[] = [];
    const resolver = createStreamResolver({
      adapter,
      station: SINGLE,
      onStateChange: (s) => states.push(s),
      backoffMs: [10, 20, 30],
      scheduleRetry: (fn) => scheduled.push(fn),
    });

    await resolver.play();
    expect(states).toEqual(['loading', 'retrying']);
    expect(adapter.play).toHaveBeenCalledTimes(1);

    flushScheduled(scheduled);
    await Promise.resolve();
    expect(states).toEqual(['loading', 'retrying', 'retrying']);

    flushScheduled(scheduled);
    await Promise.resolve();
    expect(states).toEqual(['loading', 'retrying', 'retrying', 'playing']);
    expect(resolver.getState()).toBe('playing');
  });

  it('goes offline after exhausting all retries', async () => {
    const adapter: AudioAdapter = { play: vi.fn().mockRejectedValue(new Error('fail')), stop: vi.fn() };
    const scheduled: Array<() => void> = [];
    const states: StreamState[] = [];
    const resolver = createStreamResolver({
      adapter,
      station: SINGLE,
      onStateChange: (s) => states.push(s),
      backoffMs: [10, 20],
      scheduleRetry: (fn) => scheduled.push(fn),
    });

    await resolver.play();
    flushScheduled(scheduled);
    await Promise.resolve();
    flushScheduled(scheduled);
    await Promise.resolve();

    expect(states).toEqual(['loading', 'retrying', 'retrying', 'offline']);
    expect(resolver.getState()).toBe('offline');
  });

  it('stop() halts pending retries and resets to idle', async () => {
    const adapter: AudioAdapter = { play: vi.fn().mockRejectedValue(new Error('fail')), stop: vi.fn() };
    const scheduled: Array<() => void> = [];
    const states: StreamState[] = [];
    const resolver = createStreamResolver({
      adapter,
      station: SINGLE,
      onStateChange: (s) => states.push(s),
      backoffMs: [10],
      scheduleRetry: (fn) => scheduled.push(fn),
    });

    await resolver.play();
    resolver.stop();
    flushScheduled(scheduled);
    await Promise.resolve();

    expect(adapter.stop).toHaveBeenCalledTimes(1);
    expect(resolver.getState()).toBe('idle');
  });

  it('getUrl starts at RadioJar', () => {
    const adapter: AudioAdapter = { play: vi.fn(), stop: vi.fn() };
    const resolver = createStreamResolver({ adapter });
    expect(resolver.getUrl()).toBe(RADIOJAR_STREAM_URL);
  });

  it('plays RadioJar first and fails over to the official stream', async () => {
    const adapter: AudioAdapter = {
      play: vi.fn().mockImplementation((url: string) =>
        url === RADIOJAR_STREAM_URL ? Promise.reject(new Error('down')) : Promise.resolve(),
      ),
      stop: vi.fn(),
    };
    const states: StreamState[] = [];
    const resolver = createStreamResolver({ adapter, onStateChange: (s) => states.push(s) });

    await resolver.play();

    expect(vi.mocked(adapter.play).mock.calls.map(([url]) => url)).toEqual([RADIOJAR_STREAM_URL, OFFICIAL_HLS_STREAM_URL]);
    expect(states).toEqual(['loading', 'playing']);
    expect(resolver.getUrl()).toBe(OFFICIAL_HLS_STREAM_URL);
  });

  it('retries from RadioJar after every source fails', async () => {
    const adapter: AudioAdapter = { play: vi.fn().mockRejectedValue(new Error('fail')), stop: vi.fn() };
    const scheduled: Array<() => void> = [];
    const states: StreamState[] = [];
    const resolver = createStreamResolver({
      adapter,
      onStateChange: (s) => states.push(s),
      backoffMs: [10],
      scheduleRetry: (fn) => scheduled.push(fn),
    });

    await resolver.play();
    expect(states).toEqual(['loading', 'retrying']);
    expect(resolver.getUrl()).toBe(RADIOJAR_STREAM_URL);

    flushScheduled(scheduled);
    await new Promise((r) => setTimeout(r, 0));

    expect(vi.mocked(adapter.play).mock.calls.map(([url]) => url)).toEqual([
      RADIOJAR_STREAM_URL,
      OFFICIAL_HLS_STREAM_URL,
      RADIOJAR_STREAM_URL,
      OFFICIAL_HLS_STREAM_URL,
    ]);
    expect(states).toEqual(['loading', 'retrying', 'offline']);
  });

  it('goes back to idle without failing over when autoplay is blocked', async () => {
    const blocked = Object.assign(new Error('play() needs a user gesture'), { name: 'NotAllowedError' });
    const adapter: AudioAdapter = { play: vi.fn().mockRejectedValue(blocked), stop: vi.fn() };
    const scheduled: Array<() => void> = [];
    const states: StreamState[] = [];
    const onAutoplayBlocked = vi.fn();
    const resolver = createStreamResolver({
      adapter,
      onStateChange: (s) => states.push(s),
      onAutoplayBlocked,
      scheduleRetry: (fn) => scheduled.push(fn),
    });

    await resolver.play();

    expect(adapter.play).toHaveBeenCalledTimes(1);
    expect(states).toEqual(['loading', 'idle']);
    expect(scheduled).toHaveLength(0);
    expect(onAutoplayBlocked).toHaveBeenCalledTimes(1);
    expect(resolver.getUrl()).toBe(RADIOJAR_STREAM_URL);
  });
});
