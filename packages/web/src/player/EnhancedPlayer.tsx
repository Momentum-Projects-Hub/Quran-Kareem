import { useLocale } from '../i18n/LocaleContext'
import { usePlayer } from './usePlayer'
import { LiveHero } from './LiveHero'
import { OfflineLinks } from './OfflineLinks'
import { ShareButtons } from './ShareButtons'
import { StationInfo } from './StationInfo'

export function EnhancedPlayer() {
  const { t, locale, toggleLocale } = useLocale()
  const { state, isPlaying, station, toggle } = usePlayer(locale)

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 px-3 pb-16 pt-16 sm:px-6">
      <button
        type="button"
        onClick={toggleLocale}
        aria-label={t('language')}
        title={t('language')}
        className="fixed end-4 top-4 z-20 flex h-9 items-center justify-center gap-1.5 rounded-full border border-amber-400/30 bg-emerald-950/70 px-3 text-xs font-medium text-amber-100 backdrop-blur-md transition-colors hover:bg-emerald-900"
      >
        <span aria-hidden="true">🌐</span>
        {t('language')}
      </button>

      <LiveHero state={state} isPlaying={isPlaying} title={station.name[locale]} onToggle={toggle} />

      {state === 'offline' && <OfflineLinks />}

      <ShareButtons />

      <StationInfo />
    </div>
  )
}
