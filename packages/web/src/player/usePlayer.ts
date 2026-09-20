import { useEffect, useRef, useState } from 'react'
import { createStreamResolver, PRIMARY_STREAM, type Locale, type StreamResolver, type StreamState } from '@quran-fm/core'
import { createHtmlAudioAdapter } from './audioAdapter'

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

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audioRef.current = audio

    const resolver = createStreamResolver({
      adapter: createHtmlAudioAdapter(audio),
      onStateChange: setState,
    })
    resolverRef.current = resolver

    return () => {
      resolver.stop()
      audio.pause()
      audio.src = ''
      audioRef.current = null
      resolverRef.current = null
    }
  }, [])

  const isPlaying = state === 'playing' || state === 'loading' || state === 'retrying'

  function toggle() {
    const resolver = resolverRef.current
    if (!resolver) return
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
    navigator.mediaSession.setActionHandler('play', () => toggleRef.current())
    navigator.mediaSession.setActionHandler('pause', () => toggleRef.current())
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
