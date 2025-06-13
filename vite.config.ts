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
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        }
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'prompt',
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
            maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
            runtimeCaching: [
              {
                urlPattern: ({ url }) => url.origin === 'https://openrouter.ai',
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'api-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                  },
                  cacheableResponse: {
                    statuses: [0, 200],
                  },
                },
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

            ],
          },
          manifest: {
            name: 'MyNotes',
            short_name: 'MyNotes',
            description: 'A simple note-taking app',
            theme_color: '#ffffff',
            icons: [
              {
                src: 'pwa-192x192.png',
                sizes: '192x192',
                type: 'image/png',
              },
              {
                src: 'pwa-512x512.png',
                sizes: '512x512',
                type: 'image/png',
              },
            ],
          },
        })
      ]
    };
});
