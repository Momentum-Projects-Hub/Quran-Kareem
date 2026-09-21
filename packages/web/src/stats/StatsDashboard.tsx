import { useLocale } from '../i18n/LocaleContext'
import { StatCard, StatCardSkeleton } from './StatCard'
import { StatsChart } from './StatsChart'
import { useStats } from './useStats'

export function StatsDashboard() {
  const { t, toggleLocale } = useLocale()
  const { data, status, last30, todayVsYesterday, refetch } = useStats()

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-amber-50">{t('statsTitle')}</h1>
          <div className="flex items-center gap-3">
            <a
              href={import.meta.env.BASE_URL}
              className="text-sm text-white/60 underline decoration-white/20 underline-offset-4 hover:text-white/90"
            >
              {t('statsBackToPlayer')}
            </a>
            <button
              type="button"
              onClick={toggleLocale}
              aria-label={t('language')}
              title={t('language')}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-base backdrop-blur-md transition-colors hover:bg-white/15"
            >
              🌐
            </button>
          </div>
        </div>

        {status === 'error' && (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-5 text-center">
            <p className="text-sm text-red-200">{t('statsError')}</p>
            <button
              type="button"
              onClick={refetch}
              className="mt-3 rounded-full bg-amber-500 px-4 py-1.5 text-sm font-medium text-emerald-950 transition hover:bg-amber-400"
            >
              {t('statsRetry')}
            </button>
          </div>
        )}

        {status !== 'error' && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {status === 'loading' ? (
                <>
                  <StatCardSkeleton highlighted />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  <StatCard
                    label={t('statsToday')}
                    value={data!.today}
                    highlighted
                    trend={todayVsYesterday === null ? null : { label: t('statsVsYesterday'), value: todayVsYesterday }}
                  />
                  <StatCard label={t('statsLast7Days')} value={data!.last7Days} />
                  <StatCard label={t('statsLast30Days')} value={data!.last30Days} />
                </>
              )}
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl backdrop-blur-xl">
              <p className="text-sm text-white/60">{t('statsDailyChart')}</p>
              <div className="mt-4">
                {status === 'loading' ? (
                  <div className="h-40 w-full animate-pulse rounded-xl bg-white/10" />
                ) : (
                  <StatsChart points={last30} emptyLabel={t('statsEmpty')} />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
