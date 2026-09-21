interface Env {
  PLAY_STATS: KVNamespace
}

function todayKey(): string {
  return `plays:${new Date().toISOString().slice(0, 10)}`
}

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
  const key = todayKey()
  const existing = await env.PLAY_STATS.get(key)
  const count = (existing ? parseInt(existing, 10) : 0) + 1
  await env.PLAY_STATS.put(key, String(count), { metadata: { count } })
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'content-type': 'application/json' },
  })
}
