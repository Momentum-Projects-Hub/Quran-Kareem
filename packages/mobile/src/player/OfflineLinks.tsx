import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EXTERNAL_LISTEN_LINKS } from '@quran-fm/core';
import { useLocale } from '../i18n/LocaleContext';

export function OfflineLinks() {
  const { t } = useLocale();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('offline')}</Text>
      <Text style={styles.subtitle}>{t('listenExternally')}</Text>
      {EXTERNAL_LISTEN_LINKS.map((link) => (
        <TouchableOpacity key={link.url} onPress={() => Linking.openURL(link.url)}>
          <Text style={styles.link}>{link.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    width: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 16,
  },
  title: {
    color: '#fde68a',
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginBottom: 8,
  },
  link: {
    color: '#fcd34d',
    textDecorationLine: 'underline',
    paddingVertical: 4,
  },
});
