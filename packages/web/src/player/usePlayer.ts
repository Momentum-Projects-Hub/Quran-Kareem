import { useEffect, useRef, useState } from 'react'
import { createStreamResolver, PRIMARY_STREAM, type StreamResolver, type StreamState } from '@quran-fm/core'
import { createHtmlAudioAdapter } from './audioAdapter'

export interface UsePlayerResult {
  state: StreamState
  isPlaying: boolean
  station: typeof PRIMARY_STREAM
  toggle: () => void
}

export function usePlayer(): UsePlayerResult {
  const [state, setState] = useState<StreamState>('idle')
  const resolverRef = useRef<StreamResolver | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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

  return { state, isPlaying, station: PRIMARY_STREAM, toggle }
}
