import { useEffect, useRef, useState } from 'react';
import { createStreamResolver, PRIMARY_STREAM, type Locale, type StreamResolver, type StreamState } from '@quran-fm/core';
import TrackPlayer, { Event } from 'react-native-track-player';
import { createTrackPlayerAdapter } from './trackPlayerAdapter';

export interface UsePlayerResult {
  state: StreamState;
  isPlaying: boolean;
  station: typeof PRIMARY_STREAM;
  toggle: () => void;
}

export function usePlayer(locale: Locale): UsePlayerResult {
  const [state, setState] = useState<StreamState>('idle');
  const resolverRef = useRef<StreamResolver | null>(null);

  useEffect(() => {
    const resolver = createStreamResolver({
      adapter: createTrackPlayerAdapter(locale),
      onStateChange: setState,
    });
    resolverRef.current = resolver;

    return () => {
      resolver.stop();
      resolverRef.current = null;
    };
  }, [locale]);

  const isPlaying = state === 'playing' || state === 'loading' || state === 'retrying';

  function toggle() {
    const resolver = resolverRef.current;
    if (!resolver) return;
    if (isPlaying) {
      resolver.stop();
    } else {
      void resolver.play();
    }
  }

  // Interruptions (phone calls, other audio apps): pause on duck, but never
  // auto-resume when the interruption ends — a surprise resume is worse than
  // requiring the user to tap play again (§7 point 5).
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.RemoteDuck, ({ paused, permanent }) => {
      if (paused || permanent) resolverRef.current?.stop();
    });
    return () => sub.remove();
  }, []);

  return { state, isPlaying, station: PRIMARY_STREAM, toggle };
}
