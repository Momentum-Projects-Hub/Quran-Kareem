import { useLocale } from '../i18n/LocaleContext'
import { usePlayer } from './usePlayer'
import { EqualizerBars } from './EqualizerBars'
import { OfflineLinks } from './OfflineLinks'
import { ShareButtons } from './ShareButtons'
import { StationInfo } from './StationInfo'

export function EnhancedPlayer() {
  const { t, locale, toggleLocale } = useLocale()
  const { state, isPlaying, station, toggle } = usePlayer(locale)

  const statusLabel =
    state === 'loading' ? t('loading') : state === 'retrying' ? t('retrying') : state === 'playing' ? t('stationTagline') : t('stationTagline')

  return (
    <div className="min-h-screen w-full flex flex-col items-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 px-4 py-16">
      <button
        type="button"
        onClick={toggleLocale}
        aria-label={t('language')}
        title={t('language')}
        className="fixed right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-base backdrop-blur-md transition-colors hover:bg-white/15"
      >
        🌐
      </button>

      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col items-center text-center">
          <img
            src={`${import.meta.env.BASE_URL}station-artwork.svg`}
            alt={t('stationLogoAlt')}
            className="h-32 w-32 rounded-2xl shadow-lg"
            width={128}
            height={128}
          />

          <h1 className="mt-4 text-xl font-semibold text-amber-50">{station.name[locale]}</h1>
          <p className="mt-1 text-sm text-white/70">{statusLabel}</p>

          <div className="mt-3">
            <EqualizerBars active={state === 'playing'} />
          </div>

          <button
            type="button"
            onClick={toggle}
            disabled={state === 'loading' || state === 'retrying'}
            className={`mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500 text-emerald-950 shadow-lg transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60 ${isPlaying ? 'animate-pulse-ring' : ''}`}
            aria-label={isPlaying ? t('pause') : t('play')}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          {state === 'offline' && <OfflineLinks />}

          <ShareButtons />
        </div>
      </div>

      <StationInfo />
    </div>
  )
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 translate-x-0.5">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  )
}
