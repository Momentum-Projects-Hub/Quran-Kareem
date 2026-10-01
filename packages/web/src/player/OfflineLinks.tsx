import { EXTERNAL_LISTEN_LINKS } from '@quran-fm/core'
import { useLocale } from '../i18n/LocaleContext'

export function OfflineLinks() {
  const { t } = useLocale()
  const [primary, ...others] = EXTERNAL_LISTEN_LINKS

  return (
    <div role="alert" className="mt-6 w-full max-w-4xl rounded-2xl border border-amber-500/30 bg-black/25 p-5 text-center text-sm text-amber-100">
      <p className="font-medium">{t('offline')}</p>
      <a
        href={primary.url}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 px-6 py-2.5 font-semibold text-emerald-950 shadow-lg transition hover:from-amber-200 hover:to-amber-400"
      >
        {primary.label}
      </a>
      <p className="mt-4 text-xs opacity-80">{t('listenExternally')}</p>
      <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {others.map((link) => (
          <li key={link.url}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-amber-300 underline decoration-amber-500/50 hover:text-amber-200"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
