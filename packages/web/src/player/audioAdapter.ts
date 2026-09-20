import type { AudioAdapter } from '@quran-fm/core'

/**
 * Wraps an HTMLAudioElement as a core AudioAdapter. play() resolves once
 * the browser actually starts producing audio ('playing') and rejects on
 * 'error' or 'stalled' so the resolver's retry/backoff loop can take over.
 */
export function createHtmlAudioAdapter(audio: HTMLAudioElement): AudioAdapter {
  return {
    play(url: string): Promise<void> {
      return new Promise((resolve, reject) => {
        let settled = false

        const cleanup = () => {
          audio.removeEventListener('playing', onPlaying)
          audio.removeEventListener('error', onError)
          audio.removeEventListener('stalled', onStalled)
        }

        const onPlaying = () => {
          if (settled) return
          settled = true
          cleanup()
          resolve()
        }

        const onError = () => {
          if (settled) return
          settled = true
          cleanup()
          reject(new Error('audio element error'))
        }

        const onStalled = () => {
          if (settled) return
          settled = true
          cleanup()
          reject(new Error('audio element stalled'))
        }

        audio.addEventListener('playing', onPlaying)
        audio.addEventListener('error', onError)
        audio.addEventListener('stalled', onStalled)

        // Always re-point at the public URL fresh (never a cached redirect
        // target) and let the browser follow the 302 on every attempt.
        if (audio.src !== url) audio.src = url
        audio.play().catch((err) => {
          if (settled) return
          settled = true
          cleanup()
          reject(err instanceof Error ? err : new Error(String(err)))
        })
      })
    },
    stop() {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    },
  }
}
