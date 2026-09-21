import { useState } from 'react'
import type { DailyPoint } from './useStats'

interface StatsChartProps {
  points: DailyPoint[]
  emptyLabel: string
}

const WIDTH = 600
const HEIGHT = 160
const BAR_GAP = 2

export function StatsChart({ points, emptyLabel }: StatsChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)

  const max = Math.max(1, ...points.map((p) => p.count))
  const isEmpty = points.every((p) => p.count === 0)
  const barWidth = points.length > 0 ? WIDTH / points.length - BAR_GAP : 0

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={emptyLabel}>
        {points.map((p, i) => {
          const barHeight = isEmpty ? 2 : Math.max(2, (p.count / max) * (HEIGHT - 20))
          const x = i * (barWidth + BAR_GAP)
          const y = HEIGHT - barHeight
          const isHovered = hovered === i
          return (
            <rect
              key={p.date}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={2}
              className={isHovered ? 'fill-amber-400' : 'fill-amber-500/60'}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
            >
              <title>{`${p.date}: ${p.count}`}</title>
            </rect>
          )
        })}
      </svg>

      {hovered !== null && points[hovered] && (
        <div className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-emerald-950/95 px-3 py-1.5 text-xs text-amber-50 shadow-lg">
          <div className="font-semibold">{points[hovered].count}</div>
          <div className="text-white/60">{points[hovered].date}</div>
        </div>
      )}

      {isEmpty && <p className="mt-2 text-center text-sm text-white/50">{emptyLabel}</p>}
    </div>
  )
}
