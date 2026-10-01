import { useState } from 'react'
import type { StreamState } from '@quran-fm/core'
import { useLocale } from '../i18n/LocaleContext'

interface LiveHeroProps {
  state: StreamState
  isPlaying: boolean
  title: string
  onToggle: () => void
}

/**
 * Landscape "live broadcast" card modelled on the official Quran Radio Cairo
 * artwork: gold geometric lattice on the sides, a cusped gold arch framing a
 * deep-green panel, hanging lanterns, emblem, gold title and a waveform.
 */
export function LiveHero({ state, isPlaying, title, onToggle }: LiveHeroProps) {
  const { t } = useLocale()
  const busy = state === 'loading' || state === 'retrying'
  const statusLine = state === 'loading' ? t('loading') : state === 'retrying' ? t('retrying') : t('stationTagline')

  return (
    <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-emerald-950 shadow-2xl ring-1 ring-amber-500/20 md:aspect-[16/9]">
      <GeometricBackdrop />
      <ArchFrame />
      <Lanterns />

      <LiveBadge active={state === 'playing'} label={t('liveBadge')} />
      <HeroShareButton />

      <div className="relative flex h-full flex-col items-center justify-center px-[20%] pb-8 pt-20 text-center md:pb-10 md:pt-10">
        <Emblem label={t('stationLogoAlt')} />

        <h1 className="mt-4 bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-2xl font-bold leading-snug text-transparent drop-shadow-sm sm:text-3xl lg:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-lg font-bold text-white sm:text-2xl">{t('liveSubtitle')}</p>
        <p className="mt-1 text-xs text-white/60 sm:text-sm" aria-live="polite">
          {statusLine}
        </p>

        <div className="mt-6 flex items-center gap-3 sm:gap-4">
          <Waveform active={state === 'playing'} side="start" />
          <button
            type="button"
            data-player-toggle
            onClick={onToggle}
            disabled={busy}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-amber-300 to-amber-500 text-emerald-950 shadow-lg ring-2 ring-amber-200/40 transition hover:from-amber-200 hover:to-amber-400 disabled:cursor-not-allowed disabled:opacity-60 sm:h-16 sm:w-16 ${isPlaying ? 'animate-pulse-ring' : ''}`}
            aria-label={isPlaying ? t('pause') : t('play')}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <Waveform active={state === 'playing'} side="end" />
        </div>
      </div>
    </div>
  )
}

function GeometricBackdrop() {
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="hero-lattice" width="48" height="48" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="#d4af37" strokeWidth="1.1" opacity="0.55">
            <rect x="12" y="12" width="24" height="24" />
            <rect x="12" y="12" width="24" height="24" transform="rotate(45 24 24)" />
            <path d="M0 0 L7 7 M48 0 L41 7 M0 48 L7 41 M48 48 L41 41 M24 0 V7 M24 48 V41 M0 24 H7 M48 24 H41" />
          </g>
        </pattern>
        <radialGradient id="hero-bg" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#14563f" />
          <stop offset="100%" stopColor="#062a1e" />
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#hero-bg)" />
      <rect width="100%" height="100%" fill="url(#hero-lattice)" />
    </svg>
  )
}

// Cusped arch in a 100×100 box stretched to the card, so it adapts to both the
// tall mobile layout and the 16:9 desktop one; strokes stay crisp via non-scaling-stroke.
const ARCH_PATH =
  'M18,0 Q8,6 12,14 Q16,22 10,30 Q2,50 10,70 Q16,78 12,86 Q8,94 18,100 ' +
  'L82,100 Q92,94 88,86 Q84,78 90,70 Q98,50 90,30 Q84,22 88,14 Q92,6 82,0 Z'

function ArchFrame() {
  return (
    <svg
      className="absolute inset-0 h-full w-full drop-shadow-[0_0_10px_rgba(212,175,55,0.35)]"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="hero-panel" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#1b6a4c" />
          <stop offset="70%" stopColor="#0f4a35" />
          <stop offset="100%" stopColor="#0a3a29" />
        </radialGradient>
        <linearGradient id="hero-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6e27a" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#a8801f" />
        </linearGradient>
      </defs>
      <path d={ARCH_PATH} fill="url(#hero-panel)" stroke="url(#hero-gold)" strokeWidth="5" vectorEffect="non-scaling-stroke" />
      <path d={ARCH_PATH} fill="none" stroke="#f6e27a" strokeWidth="1" opacity="0.6" vectorEffect="non-scaling-stroke" transform="translate(50 50) scale(0.97 0.985) translate(-50 -50)" />
    </svg>
  )
}

const LANTERNS = [
  { pos: 'start-[21%]', rope: 'h-16 md:h-24', delay: '0s', size: 'w-6 md:w-8' },
  { pos: 'start-[29%]', rope: 'h-8 md:h-12', delay: '0.6s', size: 'w-5 md:w-6' },
  { pos: 'end-[29%]', rope: 'h-8 md:h-12', delay: '1.1s', size: 'w-5 md:w-6' },
  { pos: 'end-[21%]', rope: 'h-16 md:h-24', delay: '0.3s', size: 'w-6 md:w-8' },
]

function Lanterns() {
  return (
    <div aria-hidden="true">
      {LANTERNS.map((l) => (
        <div key={l.pos} className={`animate-sway absolute top-0 flex flex-col items-center ${l.pos}`} style={{ animationDelay: l.delay }}>
          <span className={`w-px bg-amber-200/70 ${l.rope}`} />
          <Lantern className={l.size} />
        </div>
      ))}
    </div>
  )
}

function Lantern({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 44" className={`${className} drop-shadow-[0_0_8px_rgba(253,230,138,0.7)]`}>
      <circle cx="12" cy="2.5" r="2" fill="none" stroke="#e7c766" strokeWidth="1.2" />
      <path d="M5 11 L12 4.5 L19 11 Z" fill="#d4af37" />
      <rect x="4" y="11" width="16" height="2.5" rx="1" fill="#b8912a" />
      <path d="M5 13.5 H19 L18 32 H6 Z" fill="#fde68a" opacity="0.9" />
      <path d="M8.5 13.5 V32 M12 13.5 V32 M15.5 13.5 V32" stroke="#b8912a" strokeWidth="1" />
      <rect x="4" y="31.5" width="16" height="2.5" rx="1" fill="#b8912a" />
      <path d="M7 34 H17 L12 42 Z" fill="#d4af37" />
    </svg>
  )
}

function Emblem({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 120 104" role="img" aria-label={label} className="h-20 w-auto drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)] sm:h-24 lg:h-28">
      <defs>
        <linearGradient id="emblem-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f6e27a" />
          <stop offset="100%" stopColor="#c19a2e" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#emblem-gold)" strokeWidth="2.4" strokeLinecap="round">
        {/* broadcast waves */}
        <path d="M52 10 A10 10 0 0 1 52 22 M68 10 A10 10 0 0 0 68 22" />
        <path d="M47 6 A16 16 0 0 1 47 26 M73 6 A16 16 0 0 0 73 26" />
        {/* minaret */}
        <path d="M60 14 V30 M55 30 H65 L63 44 H57 Z" />
        {/* arch */}
        <path d="M28 82 V58 Q28 40 60 36 Q92 40 92 58 V82" />
        {/* open book */}
        <path d="M14 80 Q38 72 60 86 Q82 72 106 80 M14 88 Q38 80 60 94 Q82 80 106 88" />
      </g>
      <circle cx="60" cy="16" r="2.6" fill="#f6e27a" />
      <text x="60" y="72" textAnchor="middle" fontSize="26" fontWeight="700" fill="url(#emblem-gold)" fontFamily="Cairo, Tajawal, serif">
        قرآن
      </text>
    </svg>
  )
}

const WAVE_HEIGHTS = [0.35, 0.6, 0.85, 0.5, 1, 0.7, 0.45, 0.9, 0.55]

function Waveform({ active, side }: { active: boolean; side: 'start' | 'end' }) {
  const heights = side === 'start' ? WAVE_HEIGHTS : [...WAVE_HEIGHTS].reverse()
  return (
    <div className="flex h-10 items-center gap-[3px] sm:h-12 sm:gap-1" aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-full bg-white sm:w-1 ${active ? 'animate-wave' : 'opacity-80'}`}
          style={{ height: `${h * 100}%`, animationDelay: active ? `${(i % 5) * 0.13}s` : undefined }}
        />
      ))}
    </div>
  )
}

function LiveBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="absolute start-3 top-3 z-10 flex items-center gap-2 rounded-md bg-black/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:start-4 sm:top-4 sm:text-sm">
      <span className="relative flex h-2.5 w-2.5">
        {active && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />}
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
      </span>
      {label}
    </div>
  )
}

function HeroShareButton() {
  const { t } = useLocale()
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    if (navigator.share) {
      try {
        await navigator.share({ title: t('appName'), text: t('appName'), url })
      } catch {
        // user cancelled the share sheet — nothing to do
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      document.getElementById('share')?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      title={copied ? t('linkCopied') : t('shareMore')}
      aria-label={t('shareMore')}
      className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-md bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/60 sm:end-4 sm:top-4"
    >
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11A2.99 2.99 0 0 0 21 5a3 3 0 1 0-5.91.7L8.04 9.81A3 3 0 1 0 6 15c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65A2.92 2.92 0 1 0 18 16.08z" />
        </svg>
      )}
    </button>
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
