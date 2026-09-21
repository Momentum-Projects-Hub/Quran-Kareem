import { useLocale } from '../i18n/LocaleContext'

export function ShareButtons() {
  const { t } = useLocale()
  const shareUrl = typeof window !== 'undefined' ? window.location.href : 'https://quranfm-live.pages.dev'
  const shareText = t('appName')

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: t('appName'), text: shareText, url: shareUrl })
      } catch {
        // user cancelled the share sheet — nothing to do
      }
    }
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-3">
      <span className="text-sm text-white/60">{t('share')}</span>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleNativeShare}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 transition-colors hover:bg-white/20"
          title={t('shareMore')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-white">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        </button>

        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
          target="_blank"
          rel="noreferrer noopener"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0088cc] transition-opacity hover:opacity-80"
          title="Telegram"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
            <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.686c.223-.198-.054-.31-.346-.11l-6.4 4.024-2.76-.86c-.6-.188-.61-.6.126-.89l10.79-4.16c.49-.187.92.117.75.922z" />
          </svg>
        </a>

        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
          target="_blank"
          rel="noreferrer noopener"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25d366] transition-opacity hover:opacity-80"
          title="WhatsApp"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
          </svg>
        </a>

        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
          target="_blank"
          rel="noreferrer noopener"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1877f2] transition-opacity hover:opacity-80"
          title="Facebook"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-white">
            <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
          </svg>
        </a>
      </div>
    </div>
  )
}
