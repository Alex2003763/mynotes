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
            // 預快取檔案模式 - 包含更多開發檔案
            globPatterns: [
              '**/*.{js,css,html,ico,png,svg,json,woff2,woff,ttf}',
              'index.html',
              'offline.html'
            ],
            maximumFileSizeToCacheInBytes: 5242880, // 5 MB
            
            // 手動添加開發模式需要的檔案
            additionalManifestEntries: [
              { url: '/', revision: '1' },
              { url: '/index.html', revision: '1' },
              { url: '/offline.html', revision: '1' }
            ],
            
            // 導航回退策略（重要！）
            navigateFallback: '/app-shell.html',
            navigateFallbackDenylist: [
              /^\/_/,
              /\/[^/?]+\.[^/]+$/,
              /\/sw-test\.html$/,
              /\/test-offline\.html$/,
              /\/offline\.html$/,
              /\/app-shell\.html$/
            ],
            
            // 跳過等待並立即接管頁面
            skipWaiting: true,
            clientsClaim: true,
            
            // 清理過期快取
            cleanupOutdatedCaches: true,
            
            // 運行時快取策略
            runtimeCaching: [
              // 開發模式的 Vite 資源（重要！）
              {
                urlPattern: /^.*\/@vite\/.*/i,
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'vite-dev-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 // 1 天
                  }
                }
              },
              // 開發模式的應用資源
              {
                urlPattern: ({ url }) => {
                  return url.pathname.endsWith('.tsx') ||
                         url.pathname.endsWith('.ts') ||
                         url.pathname.endsWith('.css') ||
                         url.pathname.endsWith('.js');
                },
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'dev-app-cache',
                  expiration: {
                    maxEntries: 50,
                    maxAgeSeconds: 60 * 60 * 24 // 1 天
                  }
                }
              },
              // 主頁面和 HTML 檔案
              {
                urlPattern: ({ request }) => request.mode === 'navigate',
                handler: 'StaleWhileRevalidate',
                options: {
                  cacheName: 'pages-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 // 1 天
                  }
                }
              },
              // CDN 資源快取
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
              // 靜態資源（圖片、字體等）
              {
                urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf)$/,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'static-assets-cache',
                  expiration: {
                    maxEntries: 60,
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
            enabled: true // 開發時也啟用，方便測試
          }
        })
      ]
    };
});
