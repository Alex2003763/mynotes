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
          registerType: 'autoUpdate',
          strategies: 'generateSW',
          injectRegister: 'auto',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          workbox: {
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,woff,ttf,eot}'],
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
            runtimeCaching: [
              {
                urlPattern: ({ url }) => url.origin === 'https://cdn.tailwindcss.com',
                handler: 'CacheFirst',
                options: {
                  cacheName: 'tailwind-css-cache',
                  expiration: {
                    maxEntries: 5,
                    maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
                  },
                },
              },
              {
                urlPattern: ({ url }) => url.origin === 'https://cdn.jsdelivr.net' && url.pathname.includes('cherry-markdown'),
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'cherry-markdown-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                  },
                },
              },
              {
                urlPattern: ({ url }) => url.origin === 'https://esm.sh',
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'esm-modules-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                  },
                },
              },
              {
                urlPattern: ({ request }) => request.destination === 'image',
                handler: 'CacheFirst',
                options: {
                  cacheName: 'images-cache',
                  expiration: {
                    maxEntries: 60,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                  },
                },
              },
              {
                urlPattern: ({ request }) => request.destination === 'style' || request.destination === 'script',
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'static-resources-cache',
                  expiration: {
                    maxEntries: 60,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                  },
                },
              },
            ],
          },
          manifest: {
            name: 'MyNotes - 智能筆記應用',
            short_name: 'MyNotes',
            description: '個人智能筆記管理器，具有 AI 驅動的筆記輔助功能',
            theme_color: '#4f46e5',
            background_color: '#ffffff',
            display: 'standalone',
            orientation: 'portrait-primary',
            scope: '/',
            start_url: '/',
            lang: 'zh-TW',
            icons: [
              {
                src: 'pencil.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'pencil.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'pencil.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
              },
              {
                src: 'pencil.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ],
            screenshots: [
              {
                src: 'pencil.png',
                sizes: '512x512',
                type: 'image/png',
                label: 'MyNotes 應用程式主畫面'
              }
            ],
            categories: ['productivity', 'utilities'],
            prefer_related_applications: false
          },
        })
      ]
    };
});
