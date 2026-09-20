import type { AudioAdapter } from '@quran-fm/core';
import { PRIMARY_STREAM, type Locale } from '@quran-fm/core';
import TrackPlayer, { Capability, Event, State } from 'react-native-track-player';

let setupDone: Promise<void> | null = null;

/**
 * TrackPlayer.setupPlayer() must only run once per app session. Capabilities
 * registered here drive the lock-screen/notification transport controls on
 * both platforms (§7) — no platform-specific UI code needed beyond this.
 */
function ensurePlayerSetup(): Promise<void> {
  if (!setupDone) {
    setupDone = (async () => {
      await TrackPlayer.setupPlayer();
      await TrackPlayer.updateOptions({
        capabilities: [Capability.Play, Capability.Pause, Capability.Stop],
        compactCapabilities: [Capability.Play, Capability.Pause],
      });
    })();
  }
  return setupDone;
}

/**
 * Wraps react-native-track-player as a core AudioAdapter, mirroring
 * packages/web/src/player/audioAdapter.ts's HTMLAudioElement adapter:
 * play() resolves once TrackPlayer actually reaches the 'playing' state and
 * rejects on a playback error, so streamResolver's retry/backoff loop can
 * take over exactly the same way it does on web.
 */
export function createTrackPlayerAdapter(locale: Locale): AudioAdapter {
  return {
    async play(url: string): Promise<void> {
      await ensurePlayerSetup();

      return new Promise((resolve, reject) => {
        let settled = false;

        const stateSub = TrackPlayer.addEventListener(Event.PlaybackState, ({ state }) => {
          if (settled) return;
          if (state === State.Playing) {
            settled = true;
            cleanup();
            resolve();
          }
        });

        const errorSub = TrackPlayer.addEventListener(Event.PlaybackError, () => {
          if (settled) return;
          settled = true;
          cleanup();
          reject(new Error('track player playback error'));
        });

        function cleanup() {
          stateSub.remove();
          errorSub.remove();
        }

        (async () => {
          try {
            await TrackPlayer.reset();
            // Always re-add the public URL fresh (never a cached redirect
            // target) — same "never resolve-and-cache the 302" rule as web (§0/§4).
            await TrackPlayer.add({
              id: PRIMARY_STREAM.id,
              url,
              title: PRIMARY_STREAM.name[locale],
              artist: 'Quran FM 98.2',
              artwork: require('../../assets/station-artwork.png'),
              isLiveStream: true,
            });
            await TrackPlayer.play();
          } catch (err) {
            if (settled) return;
            settled = true;
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        })();
      });
    },

    stop() {
      TrackPlayer.reset().catch(() => {});
    },
  };
}
