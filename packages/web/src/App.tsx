import { LocaleProvider } from './i18n/LocaleContext'
import { EnhancedPlayer } from './player/EnhancedPlayer'

function App() {
  return (
    <LocaleProvider>
      <EnhancedPlayer />
    </LocaleProvider>
  )
}

export default App
