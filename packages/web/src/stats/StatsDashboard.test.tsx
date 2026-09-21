import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocaleProvider } from '../i18n/LocaleContext'
import { StatsDashboard } from './StatsDashboard'

describe('StatsDashboard', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders stat cards once data loads', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        today: 12,
        last7Days: 80,
        last30Days: 300,
        daily: { [new Date().toISOString().slice(0, 10)]: 12 },
      }),
    })

    render(
      <LocaleProvider>
        <StatsDashboard />
      </LocaleProvider>,
    )

    await waitFor(() => expect(screen.getByText('12')).toBeInTheDocument())
    expect(screen.getByText('80')).toBeInTheDocument()
    expect(screen.getByText('300')).toBeInTheDocument()
  })

  it('shows an error state with retry when the request fails', async () => {
    ;(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'))

    render(
      <LocaleProvider>
        <StatsDashboard />
      </LocaleProvider>,
    )

    await waitFor(() => expect(screen.getByRole('button', { name: /إعادة المحاولة/ })).toBeInTheDocument())
  })
})
