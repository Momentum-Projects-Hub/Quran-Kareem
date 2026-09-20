import { EXTERNAL_LISTEN_LINKS } from '@quran-fm/core'
import { useLocale } from '../i18n/LocaleContext'

export function OfflineLinks() {
  const { t } = useLocale()

  return (
    <div className="mt-4 rounded-xl bg-black/20 p-4 text-sm text-amber-100">
      <p className="mb-2 font-medium">{t('offline')}</p>
      <p className="mb-2 text-xs opacity-80">{t('listenExternally')}</p>
      <ul className="flex flex-col gap-1">
        {EXTERNAL_LISTEN_LINKS.map((link) => (
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
