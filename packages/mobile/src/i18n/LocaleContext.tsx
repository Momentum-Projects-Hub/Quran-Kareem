import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dictionaries, localeDirection, type Locale } from '@quran-fm/core';

const STORAGE_KEY = 'quran-fm.locale';

interface LocaleContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  t: (key: keyof typeof dictionaries.en) => string;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Always default to Arabic on first launch (§11) — AsyncStorage is read
  // once at startup and swapped in after, rather than blocking first paint.
  const [locale, setLocaleState] = useState<Locale>('ar');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === 'en' || stored === 'ar') setLocaleState(stored);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, locale);

    // I18nManager.forceRTL() only takes visual effect on native after a JS
    // bundle reload — silently mirroring layout is not possible mid-session,
    // so surface a notice instead of pretending the toggle applied (§8).
    const wantsRtl = localeDirection[locale] === 'rtl';
    if (I18nManager.isRTL !== wantsRtl) {
      I18nManager.allowRTL(true);
      I18nManager.forceRTL(wantsRtl);
      Alert.alert(
        locale === 'ar' ? 'إعادة التشغيل مطلوبة' : 'Restart required',
        locale === 'ar'
          ? 'أعد تشغيل التطبيق لتطبيق اتجاه اللغة الجديد بالكامل.'
          : 'Restart the app to fully apply the new language direction.',
      );
    }
  }, [locale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: localeDirection[locale],
      t: (key) => dictionaries[locale][key],
      setLocale: setLocaleState,
      toggleLocale: () => setLocaleState((prev) => (prev === 'ar' ? 'en' : 'ar')),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider');
  return ctx;
}
