import { LocaleProvider } from './i18n/LocaleContext'
import { EnhancedPlayer } from './player/EnhancedPlayer'
import { StatsDashboard } from './stats/StatsDashboard'

function App() {
  const isStatsRoute = window.location.pathname.replace(/\/+$/, '') === '/stats'

  return <LocaleProvider>{isStatsRoute ? <StatsDashboard /> : <EnhancedPlayer />}</LocaleProvider>
}

export default App
