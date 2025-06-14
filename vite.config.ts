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
          strategies: 'injectManifest',
          injectManifest: {
            swSrc: 'public/service-worker.js',
            swDest: 'dist/service-worker.js',
            globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
            maximumFileSizeToCacheInBytes: 10 * 1024 * 1024 // 10 MB
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
                src: 'icons/icon-192x192.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'icons/icon-512x512.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'icons/icon-maskable-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'maskable'
              },
              {
                src: 'icons/icon-maskable-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable'
              }
            ],
            screenshots: [
              {
                src: 'icons/icon-512x512.png',
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
