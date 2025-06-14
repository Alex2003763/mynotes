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
          srcDir: 'public',
          filename: 'sw.js',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          workbox: {
            globPatterns: [
              '**/*.{js,css,html,ico,png,svg,json,woff2,woff,ttf,eot}',
              'assets/**/*',
              'icons/**/*',
              'locales/**/*'
            ],
            globIgnores: [
              '**/sw.js',
              '**/workbox-*.js',
              '**/dev-dist/**/*',
              '**/node_modules/**/*'
            ],
            dontCacheBustURLsMatching: /\.\w{8}\./,
            maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB
            navigateFallback: '/index.html',
            navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/, /^\/sw\.js$/, /^\/workbox-.*\.js$/],
            cleanupOutdatedCaches: true,
            skipWaiting: true,
            clientsClaim: true,
            sourcemap: false,
            disableDevLogs: true,
            swDest: 'dist/sw.js',
            runtimeCaching: [
              {
                urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'tailwind-css-cache',
                  expiration: {
                    maxEntries: 5,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                },
              },
              {
                urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/npm\/cherry-markdown@.*\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'cherry-markdown-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 30,
                  },
                },
              },
              {
                urlPattern: /^https:\/\/esm\.sh\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'esm-modules-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 7,
                  },
                },
              },
              {
                urlPattern: /^.*\/locales\/.*\.json$/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'translations-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 30,
                  },
                },
              },
              {
                urlPattern: /\.(?:png|jpg|jpeg|svg|ico|webp)$/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'images-cache',
                  expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 60 * 60 * 24 * 365,
                  },
                },
              },
              {
                urlPattern: /\.(?:js|css)$/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'static-resources-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 7,
                  },
                },
              },
              {
                urlPattern: /^https:\/\/mynotess\.usefultools\.dpdns\.org\/$/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'app-shell-cache',
                  expiration: {
                    maxEntries: 5,
                    maxAgeSeconds: 60 * 60 * 24,
                  },
                  networkTimeoutSeconds: 3,
                },
              },
              {
                urlPattern: /^https:\/\/mynotess\.usefultools\.dpdns\.org\/.*/i,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'pages-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24,
                  },
                  networkTimeoutSeconds: 3,
                },
              }
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
          
          devOptions: {
            enabled: true,
            type: 'module',
          }
        })
      ]
    };
});
