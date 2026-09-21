interface Env {
  PLAY_STATS: KVNamespace
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { keys } = await env.PLAY_STATS.list({ prefix: 'plays:' })

  const daily: Record<string, number> = {}
  for (const key of keys) {
    const date = key.name.slice('plays:'.length)
    const metaCount = (key.metadata as { count?: number } | null)?.count
    daily[date] = metaCount ?? parseInt((await env.PLAY_STATS.get(key.name)) ?? '0', 10)
  }

  const now = new Date()
  const sumLastNDays = (n: number) => {
    let total = 0
    for (let i = 0; i < n; i++) {
      const d = new Date(now)
      d.setUTCDate(d.getUTCDate() - i)
      total += daily[isoDate(d)] ?? 0
    }
    return total
  }

  const body = {
    today: daily[isoDate(now)] ?? 0,
    last7Days: sumLastNDays(7),
    last30Days: sumLastNDays(30),
    daily,
  }

  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json' },
  })
}
