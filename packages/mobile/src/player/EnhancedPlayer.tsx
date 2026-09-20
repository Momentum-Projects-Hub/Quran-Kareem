import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocale } from '../i18n/LocaleContext';
import { usePlayer } from './usePlayer';
import { EqualizerBars } from './EqualizerBars';
import { OfflineLinks } from './OfflineLinks';

export function EnhancedPlayer() {
  const { t, locale, toggleLocale } = useLocale();
  const { state, isPlaying, station, toggle } = usePlayer(locale);

  const statusLabel = state === 'loading' ? t('loading') : state === 'retrying' ? t('retrying') : t('stationTagline');
  const busy = state === 'loading' || state === 'retrying';

  return (
    <SafeAreaView style={styles.screen}>
      <TouchableOpacity
        onPress={toggleLocale}
        accessibilityLabel={t('language')}
        style={styles.languageButton}
      >
        <Text style={styles.languageButtonText}>🌐</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Image source={require('../../assets/station-artwork.png')} style={styles.artwork} />

        <Text style={styles.title}>{station.name[locale]}</Text>
        <Text style={styles.subtitle}>{statusLabel}</Text>

        <View style={styles.equalizer}>
          <EqualizerBars active={state === 'playing'} />
        </View>

        <TouchableOpacity
          onPress={toggle}
          disabled={busy}
          style={[styles.playButton, busy && styles.playButtonDisabled]}
          accessibilityLabel={isPlaying ? t('pause') : t('play')}
        >
          {busy ? (
            <ActivityIndicator color="#022c22" />
          ) : (
            <Text style={styles.playButtonIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          )}
        </TouchableOpacity>

        {state === 'offline' && <OfflineLinks />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#022c22',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  languageButton: {
    position: 'absolute',
    top: 16,
    end: 16,
    height: 36,
    width: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    zIndex: 10,
  },
  languageButtonText: {
    fontSize: 16,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 24,
    alignItems: 'center',
  },
  artwork: {
    height: 128,
    width: 128,
    borderRadius: 16,
  },
  title: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#fffbeb',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  equalizer: {
    marginTop: 12,
  },
  playButton: {
    marginTop: 24,
    height: 64,
    width: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
  },
  playButtonDisabled: {
    opacity: 0.6,
  },
  playButtonIcon: {
    fontSize: 26,
    color: '#022c22',
  },
});
