import { useEffect, useRef, useState } from 'react'
import {
  createStreamResolver,
  PRIMARY_STREAM,
  type Locale,
  type StreamResolver,
  type StreamState,
} from '@quran-fm/core'
import { createHtmlAudioAdapter } from './audioAdapter'

/**
 * Interactions that grant the page user activation, so a blocked autoplay can
 * start. Not pointerdown/touchstart: on phones and iPads those don't count, and
 * reacting to them would use up the tap on a play() the browser refuses.
 */
const GESTURE_EVENTS = ['touchend', 'click', 'keydown'] as const

export interface UsePlayerResult {
  state: StreamState
  isPlaying: boolean
  station: typeof PRIMARY_STREAM
  toggle: () => void
}

export function usePlayer(locale: Locale): UsePlayerResult {
  const [state, setState] = useState<StreamState>('idle')
  const resolverRef = useRef<StreamResolver | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const toggleRef = useRef<() => void>(() => {})
  const disarmGestureStartRef = useRef<() => void>(() => {})

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audioRef.current = audio

    // Browsers refuse sound before the visitor has interacted with the page
    // (Chrome lets it through for sites the visitor plays often). When that
    // happens, start on their first tap/click/key press anywhere instead.
    const onGesture = (event: Event) => {
      // The play button starts playback itself through toggle().
      if (event.target instanceof Element && event.target.closest('[data-player-toggle]')) return
      disarmGestureStart()
      if (resolver.getState() === 'idle') void resolver.play()
    }
    const disarmGestureStart = () => {
      GESTURE_EVENTS.forEach((type) => document.removeEventListener(type, onGesture, true))
    }
    const armGestureStart = () => {
      disarmGestureStart()
      GESTURE_EVENTS.forEach((type) => document.addEventListener(type, onGesture, true))
    }
    disarmGestureStartRef.current = disarmGestureStart

    const resolver = createStreamResolver({
      adapter: createHtmlAudioAdapter(audio),
      station: PRIMARY_STREAM,
      onStateChange: setState,
      onAutoplayBlocked: armGestureStart,
    })
    resolverRef.current = resolver

    // Start the broadcast as soon as the visitor lands.
    void resolver.play()

    // If the system paused the stream while the page was hidden or locked (the
    // visitor never pressed pause), reconnect as soon as they come back.
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && resolver.getState() === 'playing' && audio.paused) {
        void resolver.play()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      disarmGestureStart()
      resolver.stop()
      audio.pause()
      audio.src = ''
      audioRef.current = null
      resolverRef.current = null
    }
  }, [])

  const isPlaying = state === 'playing' || state === 'loading' || state === 'retrying'

  // Counts one "play" per browser session the first time the stream actually starts —
  // not on every reconnect/retry — so /api/stats reflects distinct listens, not blips.
  const hasCountedPlayRef = useRef(false)
  useEffect(() => {
    if (state === 'playing' && !hasCountedPlayRef.current) {
      hasCountedPlayRef.current = true
      fetch('/api/play', { method: 'POST', keepalive: true }).catch(() => {})
    }
  }, [state])

  function toggle() {
    const resolver = resolverRef.current
    if (!resolver) return
    disarmGestureStartRef.current()
    if (isPlaying) {
      resolver.stop()
    } else {
      void resolver.play()
    }
  }

  toggleRef.current = toggle

  // Lock-screen / hardware media-key controls (Web Media Session API). This is a
  // standard browser API — Chromium (and Electron, which embeds it) surfaces it as
  // Windows System Media Transport Controls on the lock screen and volume flyout,
  // so no platform-specific desktop code is needed for §5/§7's lock-screen goal.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: PRIMARY_STREAM.name[locale],
      artist: 'Quran FM 98.2',
      artwork: [
        { src: `${import.meta.env.BASE_URL}station-artwork.svg`, sizes: '512x512', type: 'image/svg+xml' },
      ],
    })
    // Explicit play/stop rather than toggle: if the system paused the audio behind
    // our back, the lock-screen Play button must (re)start it, not stop it.
    navigator.mediaSession.setActionHandler('play', () => {
      disarmGestureStartRef.current()
      if (audioRef.current?.paused) void resolverRef.current?.play()
    })
    navigator.mediaSession.setActionHandler('pause', () => resolverRef.current?.stop())
    return () => {
      navigator.mediaSession.setActionHandler('play', null)
      navigator.mediaSession.setActionHandler('pause', null)
    }
  }, [locale])

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused'
    }
    // Keeps the Electron desktop shell's system-tray menu label/tooltip in sync
    // with actual playback state; a no-op on plain web (window.desktop is undefined).
    window.desktop?.reportPlaybackState(isPlaying)
  }, [isPlaying])

  // Desktop shell's tray "Play"/"Pause" menu item drives the same toggle as the UI button.
  useEffect(() => {
    window.desktop?.onTrayTogglePlayback(() => toggleRef.current())
  }, [])

  return { state, isPlaying, station: PRIMARY_STREAM, toggle }
}
