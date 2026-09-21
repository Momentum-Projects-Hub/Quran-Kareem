import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'favicon.svg', 'station-artwork.svg'],
      manifest: {
        name: 'Quran FM 98.2 — Cairo',
        short_name: 'Quran FM 98.2',
        description: 'Live Quran radio stream from Cairo, 98.2 FM',
        start_url: '.',
        display: 'standalone',
        background_color: '#0f3d2e',
        theme_color: '#0f3d2e',
        icons: [
          { src: 'favicon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'favicon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The live audio stream is never cached; only the app shell is precached
        // so the player UI (and its lock-screen controls) load reliably offline/backgrounded.
        navigateFallbackDenylist: [/^\/api/, /^\/sitemap\.xml$/, /^\/robots\.txt$/],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
  },
})
