import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
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
        react(),
        VitePWA({
          registerType: 'prompt',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          devOptions: {
            enabled: false
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,woff,ttf}'],
            maximumFileSizeToCacheInBytes: 5242880, // 5 MB
            skipWaiting: true,
            clientsClaim: true,
            cleanupOutdatedCaches: true,
            navigateFallback: '/index.html',
            navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                  }
                }
              },
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                  }
                }
              },
              {
                urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'tailwind-css-cache',
                  expiration: {
                    maxEntries: 5,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // <== 30 days
                  }
                }
              },
              {
                urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'cloudflare-cdn-cache',
                  expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                  }
                }
              },
              {
                urlPattern: /^https:\/\/esm\.sh\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'esm-modules-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // <== 7 days
                  }
                }
              },
              {
                urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'jsdelivr-cdn-cache',
                  expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                  }
                }
              },
              {
                urlPattern: /^.*\/locales\/.*\.json$/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'mynotes-translations',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // <== 30 days
                  }
                }
              },
              {
                urlPattern: ({ request }: { request: Request }) => {
                  return request.destination === 'document' ||
                         request.destination === 'script' ||
                         request.destination === 'style';
                },
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'mynotes-app-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // <== 7 days
                  }
                }
              },
              {
                urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'mynotes-images',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // <== 30 days
                  }
                }
              }
            ]
          },
          manifest: {
            name: 'MyNotes - 離線筆記應用',
            short_name: 'MyNotes',
            description: 'A powerful, offline-first, intelligent note-taking application.',
            theme_color: '#4f46e5',
            background_color: '#f5f7fb',
            display: 'standalone',
            orientation: 'portrait-primary',
            scope: '/',
            start_url: '/',
            id: '/',
            categories: ['productivity', 'utilities'],
            prefer_related_applications: false,
            icons: [
              {
                src: '/icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any'
              },
              {
                src: '/icons/icon-maskable-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
              },
              {
                src: '/icons/icon-maskable-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ]
          }
        })
      ]
    };
});
