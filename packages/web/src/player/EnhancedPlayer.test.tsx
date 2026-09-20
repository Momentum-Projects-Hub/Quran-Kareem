import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../i18n/LocaleContext'
import { EnhancedPlayer } from './EnhancedPlayer'
import * as usePlayerModule from './usePlayer'

function mockPlayerState(state: 'idle' | 'playing' | 'offline') {
  vi.spyOn(usePlayerModule, 'usePlayer').mockReturnValue({
    state,
    isPlaying: state === 'playing',
    station: { id: 'quran-fm-982-cairo', name: { ar: 'إذاعة القرآن الكريم من القاهرة', en: 'Quran FM 98.2 — Cairo' }, url: 'https://stream.radiojar.com/8s5u5tpdtwzuv' },
    toggle: vi.fn(),
  })
}

describe('EnhancedPlayer', () => {
  it('renders external listen links when offline', () => {
    mockPlayerState('offline')
    render(
      <LocaleProvider>
        <EnhancedPlayer />
      </LocaleProvider>,
    )

    expect(screen.getByText('Holy Quran Radio')).toBeInTheDocument()
    expect(screen.getByText('Surah Quran (Cairo)')).toBeInTheDocument()
    expect(screen.getByText('Radio Garden')).toBeInTheDocument()
  })

  it('does not render external links while playing', () => {
    mockPlayerState('playing')
    render(
      <LocaleProvider>
        <EnhancedPlayer />
      </LocaleProvider>,
    )

    expect(screen.queryByText('Holy Quran Radio')).not.toBeInTheDocument()
  })

  it('toggles station name language and dir on the html root', () => {
    mockPlayerState('idle')
    render(
      <LocaleProvider>
        <EnhancedPlayer />
      </LocaleProvider>,
    )

    expect(screen.getByText('إذاعة القرآن الكريم من القاهرة')).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('rtl')

    fireEvent.click(screen.getByRole('button', { name: 'English' }))

    expect(screen.getByText('Quran FM 98.2 — Cairo')).toBeInTheDocument()
    expect(document.documentElement.dir).toBe('ltr')
  })
})
