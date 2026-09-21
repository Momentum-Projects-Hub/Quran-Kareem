import { useCallback, useEffect, useState } from 'react'

export interface StatsResponse {
  today: number
  last7Days: number
  last30Days: number
  daily: Record<string, number>
}

export interface DailyPoint {
  date: string
  count: number
}

interface UseStatsResult {
  data: StatsResponse | null
  status: 'loading' | 'error' | 'ready'
  last30: DailyPoint[]
  todayVsYesterday: number | null
  refetch: () => void
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function last30Points(daily: Record<string, number>): DailyPoint[] {
  const points: DailyPoint[] = []
  const now = new Date()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i)
    const date = isoDate(d)
    points.push({ date, count: daily[date] ?? 0 })
  }
  return points
}

export function useStats(): UseStatsResult {
  const [data, setData] = useState<StatsResponse | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'ready'>('loading')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    fetch('/api/stats')
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with ${res.status}`)
        return res.json() as Promise<StatsResponse>
      })
      .then((body) => {
        if (cancelled) return
        setData(body)
        setStatus('ready')
      })
      .catch(() => {
        if (cancelled) return
        setStatus('error')
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  const refetch = useCallback(() => {
    setStatus('loading')
    setAttempt((n) => n + 1)
  }, [])

  const last30 = data ? last30Points(data.daily) : []

  let todayVsYesterday: number | null = null
  if (data) {
    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    const yesterdayCount = data.daily[isoDate(yesterday)] ?? 0
    if (yesterdayCount > 0) {
      todayVsYesterday = ((data.today - yesterdayCount) / yesterdayCount) * 100
    }
  }

  return { data, status, last30, todayVsYesterday, refetch }
}
