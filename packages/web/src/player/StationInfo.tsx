import { useLocale } from '../i18n/LocaleContext'

const SECTIONS = [
  ['infoHistoryTitle', 'infoHistoryBody'],
  ['infoFrequencyTitle', 'infoFrequencyBody'],
  ['infoProgramsTitle', 'infoProgramsBody'],
] as const

export function StationInfo() {
  const { t } = useLocale()

  return (
    <section className="mt-12 grid w-full max-w-4xl gap-4 text-start text-white/80 md:grid-cols-3">
      {SECTIONS.map(([title, body]) => (
        <article key={title} className="rounded-2xl border border-amber-500/20 bg-white/[0.04] p-5 backdrop-blur-sm">
          <h2 className="text-base font-semibold text-amber-200">{t(title)}</h2>
          <p className="mt-2 text-sm leading-relaxed">{t(body)}</p>
        </article>
      ))}
    </section>
  )
}
