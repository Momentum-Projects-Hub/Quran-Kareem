import ar from './ar.json' with { type: 'json' };
import en from './en.json' with { type: 'json' };

export type Locale = 'ar' | 'en';

export const dictionaries: Record<Locale, typeof en> = { ar, en };

export const localeDirection: Record<Locale, 'rtl' | 'ltr'> = {
  ar: 'rtl',
  en: 'ltr',
};

export function t(locale: Locale, key: keyof typeof en): string {
  return dictionaries[locale][key];
}
