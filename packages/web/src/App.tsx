import { lazy, Suspense } from 'react'
import { LocaleProvider } from './i18n/LocaleContext'
import { EnhancedPlayer } from './player/EnhancedPlayer'

const StatsDashboard = lazy(() => import('./stats/StatsDashboard').then((m) => ({ default: m.StatsDashboard })))

function App() {
  const isStatsRoute = window.location.pathname.replace(/\/+$/, '') === '/stats'

  return (
    <LocaleProvider>
      {isStatsRoute ? (
        <Suspense fallback={<div className="min-h-screen w-full bg-emerald-950" />}>
          <StatsDashboard />
        </Suspense>
      ) : (
        <EnhancedPlayer />
      )}
    </LocaleProvider>
  )
}

export default App
