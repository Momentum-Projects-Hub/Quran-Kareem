import { PRIMARY_STREAM, type Station } from './streams.js';

export type StreamState = 'idle' | 'loading' | 'playing' | 'retrying' | 'offline';

/**
 * Backoff schedule in ms between retry rounds. Each round tries every station
 * URL in priority order (official stream first, then fallbacks); only when the
 * whole round fails do we wait and start again from the top.
 */
export const RETRY_BACKOFF_MS = [2000, 5000, 10000];

/**
 * Minimal playback surface the resolver drives. Implemented with
 * HTMLAudioElement on web, react-native-track-player on mobile — core stays
 * framework-agnostic and just orchestrates retry/backoff around whatever
 * adapter is injected.
 */
export interface AudioAdapter {
  play(url: string): Promise<void>;
  stop(): void;
}

/**
 * True when playback was refused because the platform requires a user gesture
 * first (browser autoplay policy rejects HTMLMediaElement.play() with a
 * NotAllowedError). That is not a broken stream, so it must not trigger failover.
 */
export function isAutoplayBlockedError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'NotAllowedError';
}

export interface StreamResolverOptions {
  adapter: AudioAdapter;
  station?: Station;
  onStateChange?: (state: StreamState) => void;
  /** Called when the platform blocked playback pending a user gesture; the resolver goes back to idle. */
  onAutoplayBlocked?: () => void;
  /** Overridable for tests; defaults to RETRY_BACKOFF_MS */
  backoffMs?: number[];
  /** Overridable for tests; defaults to global setTimeout */
  scheduleRetry?: (fn: () => void, delayMs: number) => void;
}

export interface StreamResolver {
  play(): Promise<void>;
  stop(): void;
  getState(): StreamState;
  getUrl(): string;
}

export function createStreamResolver(options: StreamResolverOptions): StreamResolver {
  const {
    adapter,
    station = PRIMARY_STREAM,
    onStateChange,
    onAutoplayBlocked,
    backoffMs = RETRY_BACKOFF_MS,
    scheduleRetry = (fn, delayMs) => setTimeout(fn, delayMs),
  } = options;

  let state: StreamState = 'idle';
  let attempt = 0;
  let urlIndex = 0;
  let stopped = false;

  function setState(next: StreamState) {
    state = next;
    onStateChange?.(next);
  }

  async function attemptPlay(): Promise<void> {
    if (stopped) return;
    if (attempt === 0 && urlIndex === 0) setState('loading');
    try {
      await adapter.play(station.urls[urlIndex]);
      if (stopped) return;
      attempt = 0;
      setState('playing');
    } catch (err) {
      if (stopped) return;
      if (isAutoplayBlockedError(err)) {
        // Every source would be refused the same way, so wait for a gesture instead.
        attempt = 0;
        urlIndex = 0;
        adapter.stop();
        setState('idle');
        onAutoplayBlocked?.();
        return;
      }
      if (urlIndex < station.urls.length - 1) {
        // Fail over to the next source straight away.
        urlIndex += 1;
        await attemptPlay();
        return;
      }
      urlIndex = 0;
      if (attempt < backoffMs.length) {
        const delay = backoffMs[attempt];
        attempt += 1;
        setState('retrying');
        scheduleRetry(() => {
          if (!stopped) void attemptPlay();
        }, delay);
      } else {
        setState('offline');
      }
    }
  }

  return {
    async play() {
      stopped = false;
      attempt = 0;
      urlIndex = 0;
      await attemptPlay();
    },
    stop() {
      stopped = true;
      attempt = 0;
      urlIndex = 0;
      adapter.stop();
      setState('idle');
    },
    getState() {
      return state;
    },
    getUrl() {
      return station.urls[urlIndex];
    },
  };
}
