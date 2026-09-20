import { PRIMARY_STREAM, type Station } from './streams.js';

export type StreamState = 'idle' | 'loading' | 'playing' | 'retrying' | 'offline';

/**
 * Backoff schedule in ms between retry attempts against the same URL.
 * Live streams drop connections transiently — don't fail over on the first hiccup.
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

export interface StreamResolverOptions {
  adapter: AudioAdapter;
  station?: Station;
  onStateChange?: (state: StreamState) => void;
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
    backoffMs = RETRY_BACKOFF_MS,
    scheduleRetry = (fn, delayMs) => setTimeout(fn, delayMs),
  } = options;

  let state: StreamState = 'idle';
  let attempt = 0;
  let stopped = false;

  function setState(next: StreamState) {
    state = next;
    onStateChange?.(next);
  }

  async function attemptPlay(): Promise<void> {
    if (stopped) return;
    if (attempt === 0) setState('loading');
    try {
      await adapter.play(station.url);
      if (stopped) return;
      attempt = 0;
      setState('playing');
    } catch {
      if (stopped) return;
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
      await attemptPlay();
    },
    stop() {
      stopped = true;
      attempt = 0;
      adapter.stop();
      setState('idle');
    },
    getState() {
      return state;
    },
    getUrl() {
      return station.url;
    },
  };
}
