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
          strategies: 'injectManifest',
          srcDir: 'src',
          filename: 'sw.ts',
          injectRegister: null,
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
          injectManifest: {
            maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
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
