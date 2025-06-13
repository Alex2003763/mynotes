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
            enabled: false // 在開發模式下禁用 PWA
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
            navigateFallback: '/offline.html',
            navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'tailwind-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 年
                  }
                }
              },
              {
                urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'jsdelivr-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 1 年
                  }
                }
              },
              {
                urlPattern: /^https:\/\/esm\.sh\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'esm-modules-cache',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // 1 週
                  }
                }
              },
              {
                urlPattern: ({ request }) => request.destination === 'document',
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'pages-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 // 1 天
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
