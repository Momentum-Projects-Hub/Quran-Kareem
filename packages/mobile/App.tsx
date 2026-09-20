import { StatusBar } from 'expo-status-bar';
import { LocaleProvider } from './src/i18n/LocaleContext';
import { EnhancedPlayer } from './src/player/EnhancedPlayer';

export default function App() {
  return (
    <LocaleProvider>
      <StatusBar style="light" />
      <EnhancedPlayer />
    </LocaleProvider>
  );
}
