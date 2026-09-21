interface StatCardProps {
  label: string
  value: number
  highlighted?: boolean
  trend?: { label: string; value: number } | null
}

export function StatCard({ label, value, highlighted = false, trend }: StatCardProps) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-xl backdrop-blur-xl ${
        highlighted ? 'border-amber-400/30 bg-amber-400/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-sm text-white/60">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-amber-50">{value.toLocaleString()}</p>
      {trend && (
        <p className={`mt-1 text-xs ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {trend.value >= 0 ? '▲' : '▼'} {Math.abs(trend.value).toFixed(0)}% {trend.label}
        </p>
      )}
    </div>
  )
}

export function StatCardSkeleton({ highlighted = false }: { highlighted?: boolean }) {
  return (
    <div
      className={`animate-pulse rounded-2xl border p-5 shadow-xl backdrop-blur-xl ${
        highlighted ? 'border-amber-400/30 bg-amber-400/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="h-4 w-20 rounded bg-white/10" />
      <div className="mt-2 h-8 w-16 rounded bg-white/10" />
    </div>
  )
}
