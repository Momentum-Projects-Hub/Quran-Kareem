import TrackPlayer, { Event } from 'react-native-track-player';

/**
 * Registered via TrackPlayer.registerPlaybackService (index.js). Runs in the
 * background service context, independent of whether the React tree is
 * mounted — wires the lock-screen / notification transport controls (§7).
 */
export async function playbackService(): Promise<void> {
  TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(Event.RemoteStop, () => TrackPlayer.stop());
}
