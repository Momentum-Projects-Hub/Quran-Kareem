interface EqualizerBarsProps {
  active: boolean
}

const BAR_COUNT = 4

export function EqualizerBars({ active }: EqualizerBarsProps) {
  return (
    <div className="flex items-end gap-1 h-5" aria-hidden="true">
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          className={`w-1 rounded-full bg-amber-400 ${active ? 'animate-eq' : 'h-1.5'}`}
          style={active ? { animationDelay: `${i * 0.12}s` } : undefined}
        />
      ))}
    </div>
  )
}
