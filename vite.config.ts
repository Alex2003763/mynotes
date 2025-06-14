import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      // 環境變數配置
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
          // 更新策略: 'autoUpdate' 或 'prompt'
          registerType: 'prompt',
          
          // Workbox 配置
          workbox: {
            // 預快取檔案模式
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json,woff2,woff,ttf}'],
            maximumFileSizeToCacheInBytes: 5242880, // 5 MB
            
            // iOS Safari 導航回退策略
            navigateFallback: '/index.html',
            navigateFallbackDenylist: [
              /^\/_/,
              /\/[^/?]+\.[^/]+$/,
              /\/api\//
            ],
            
            // 確保快取完整性
            skipWaiting: false,
            clientsClaim: false,
            cleanupOutdatedCaches: true,
            
            // 運行時快取策略
            runtimeCaching: [
              // Google Fonts
              {
                urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 365 天
                  }
                }
              },
              // Google Fonts 靜態資源
              {
                urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'gstatic-fonts-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 365 天
                  }
                }
              },
              // Tailwind CSS CDN
              {
                urlPattern: /^https:\/\/cdn\.tailwindcss\.com\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'tailwind-css-cache',
                  expiration: {
                    maxEntries: 5,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 天
                  }
                }
              },
              // Cloudflare CDN
              {
                urlPattern: /^https:\/\/cdnjs\.cloudflare\.com\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'cloudflare-cdn-cache',
                  expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 365 天
                  }
                }
              },
              // ESM.sh 模組
              {
                urlPattern: /^https:\/\/esm\.sh\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'esm-modules-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
                  }
                }
              },
              // jsDelivr CDN
              {
                urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'jsdelivr-cdn-cache',
                  expiration: {
                    maxEntries: 20,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // 365 天
                  }
                }
              },
              // 本地化檔案
              {
                urlPattern: /^.*\/locales\/.*\.json$/i,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'translations-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 天
                  }
                }
              },
              // 導航請求 (HTML): iOS Safari 優化策略
              {
                urlPattern: ({ request }) => request.mode === 'navigate',
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'mynotes-pages',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
                  }
                }
              },
              // 應用程式資源: 快取優先，背景更新
              {
                urlPattern: ({ request }) => {
                  return request.destination === 'script' ||
                         request.destination === 'style' ||
                         request.destination === 'worker';
                },
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'mynotes-app-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 * 7 // 7 天
                  }
                }
              },
              // 圖片資源: 快取優先
              {
                urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'mynotes-images',
                  expiration: {
                    maxEntries: 100,
                    maxAgeSeconds: 60 * 60 * 24 * 30 // 30 天
                  }
                }
              }
            ]
          },
          
          // PWA Manifest 配置
          manifest: {
            name: 'MyNotes - 智能筆記應用',
            short_name: 'MyNotes',
            description: 'A powerful, offline-first, intelligent note-taking application with AI features.',
            theme_color: '#4361ee',
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
          },
          
          // 開發選項
          devOptions: {
            enabled: false // 開發時關閉，生產時啟用
          }
        })
      ]
    };
});
