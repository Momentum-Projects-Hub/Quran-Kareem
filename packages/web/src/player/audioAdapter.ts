import { isHlsUrl, type AudioAdapter } from '@quran-fm/core'
import type Hls from 'hls.js'

/** Give up on a source that hasn't started within this time so the resolver can fail over. */
const START_TIMEOUT_MS = 15000

/**
 * Wraps an HTMLAudioElement as a core AudioAdapter. play() resolves once
 * the browser actually starts producing audio ('playing') and rejects on
 * 'error', 'stalled', a fatal HLS error or a start timeout, so the resolver
 * can fail over to the next source / back off.
 *
 * HLS (.m3u8) URLs play natively where supported (Safari, iOS) and through a
 * lazily loaded hls.js everywhere else (Chrome, Firefox, Electron).
 */
export function createHtmlAudioAdapter(audio: HTMLAudioElement): AudioAdapter {
  let hls: Hls | null = null

  function destroyHls() {
    hls?.destroy()
    hls = null
  }

  return {
    play(url: string): Promise<void> {
      return new Promise((resolve, reject) => {
        let settled = false

        const cleanup = () => {
          clearTimeout(timer)
          audio.removeEventListener('playing', onPlaying)
          audio.removeEventListener('error', onError)
          audio.removeEventListener('stalled', onStalled)
        }

        const fail = (err: unknown) => {
          if (settled) return
          settled = true
          cleanup()
          destroyHls()
          reject(err instanceof Error ? err : new Error(String(err)))
        }

        const onPlaying = () => {
          if (settled) return
          settled = true
          cleanup()
          resolve()
        }

        const onError = () => fail(new Error('audio element error'))
        const onStalled = () => fail(new Error('audio element stalled'))
        const timer = setTimeout(() => fail(new Error('stream start timed out')), START_TIMEOUT_MS)

        audio.addEventListener('playing', onPlaying)
        audio.addEventListener('error', onError)
        audio.addEventListener('stalled', onStalled)

        void (async () => {
          destroyHls()
          if (isHlsUrl(url) && !audio.canPlayType('application/vnd.apple.mpegurl')) {
            const { default: HlsCtor } = await import('hls.js/light')
            if (settled) return
            if (!HlsCtor.isSupported()) throw new Error('HLS not supported')
            const instance = new HlsCtor({ lowLatencyMode: false })
            hls = instance
            instance.on(HlsCtor.Events.ERROR, (_event, data) => {
              if (data.fatal) fail(new Error(`hls ${data.type}: ${data.details}`))
            })
            instance.loadSource(url)
            instance.attachMedia(audio)
          } else if (audio.src !== url) {
            // Always re-point at the public URL fresh (never a cached redirect
            // target) and let the browser follow the 302 on every attempt.
            audio.src = url
          }
          await audio.play()
        })().catch(fail)
      })
    },
    stop() {
      destroyHls()
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    },
  }
}
