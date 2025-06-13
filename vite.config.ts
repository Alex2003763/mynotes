import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      plugins: [
        VitePWA({
          registerType: 'prompt',
          devOptions: {
            enabled: true
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,json}'],
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            navigateFallback: '/index.html',
            navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/, /^\/api\//, /^\/test-/],
            cleanupOutdatedCaches: true,
            clientsClaim: true,
            skipWaiting: true,
            // 明確包含根路徑
            additionalManifestEntries: [
              { url: '/', revision: null }
            ],
            runtimeCaching: [
              {
                urlPattern: /\/locales\/.*\.json$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'translations',
                  expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 60 * 60 * 24 * 30
                  }
                }
              },
              {
                urlPattern: ({ request }: {request: any}) => request.destination === 'document',
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'pages',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24
                  },
                  networkTimeoutSeconds: 3
                }
              }
            ]
          },
          manifest: {
            name: 'MyNotes - 智能筆記應用',
            short_name: 'MyNotes',
            description: '一個功能強大的智能筆記應用，支援離線使用',
            theme_color: '#4f46e5',
            background_color: '#f8fafc',
            display: 'standalone',
            scope: '/',
            start_url: '/',
            icons: [
              {
                src: '/pencil.png',
                sizes: '64x64',
                type: 'image/png'
              },
              {
                src: '/pencil.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/pencil.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/pencil.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
              }
            ]
          }
        })
      ]
    };
});
