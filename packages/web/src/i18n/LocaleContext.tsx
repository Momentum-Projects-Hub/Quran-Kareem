import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dictionaries, localeDirection, type Locale } from '@quran-fm/core'

const STORAGE_KEY = 'quran-fm.locale'

interface LocaleContextValue {
  locale: Locale
  dir: 'rtl' | 'ltr'
  t: (key: keyof typeof dictionaries.en) => string
  setLocale: (locale: Locale) => void
  toggleLocale: () => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readStoredLocale(): Locale {
  if (typeof window === 'undefined') return 'ar'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'en' || stored === 'ar' ? stored : 'ar'
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  useEffect(() => {
    document.documentElement.dir = localeDirection[locale]
    document.documentElement.lang = locale
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      dir: localeDirection[locale],
      t: (key) => dictionaries[locale][key],
      setLocale: setLocaleState,
      toggleLocale: () => setLocaleState((prev) => (prev === 'ar' ? 'en' : 'ar')),
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider')
  return ctx
}
