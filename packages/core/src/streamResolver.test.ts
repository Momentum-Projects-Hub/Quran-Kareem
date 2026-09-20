import { describe, expect, it, vi } from 'vitest';
import { createStreamResolver, type AudioAdapter, type StreamState } from './streamResolver.js';

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

  it('getUrl returns the station URL', () => {
    const adapter: AudioAdapter = { play: vi.fn(), stop: vi.fn() };
    const resolver = createStreamResolver({ adapter });
    expect(resolver.getUrl()).toBe('https://stream.radiojar.com/8s5u5tpdtwzuv');
  });
});
