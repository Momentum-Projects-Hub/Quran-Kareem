import { useLocale } from '../i18n/LocaleContext'

export function StationInfo() {
  const { t } = useLocale()

  return (
    <section className="mt-10 w-full max-w-sm space-y-6 text-start text-white/80">
      <div>
        <h2 className="text-base font-semibold text-amber-50">{t('infoHistoryTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed">{t('infoHistoryBody')}</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-amber-50">{t('infoFrequencyTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed">{t('infoFrequencyBody')}</p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-amber-50">{t('infoProgramsTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed">{t('infoProgramsBody')}</p>
      </div>
    </section>
  )
}
