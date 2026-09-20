import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import App from './App';
import { playbackService } from './src/player/playbackService';

// TrackPlayer's playback service must be registered at module scope so it
// can run in the background/killed-app context on Android, separate from
// the React component tree — see docs/App-dev.md §7.
TrackPlayer.registerPlaybackService(() => playbackService);

registerRootComponent(App);
