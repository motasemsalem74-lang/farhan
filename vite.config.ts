import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true, // Enable PWA in development
        type: 'module'
      },
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'logo-apple-touch.png', 'logo-192x192.png', 'logo-512x512.png'],
      manifest: {
        name: 'نظام أبو فرحان للنقل الخفيف',
        short_name: 'أبو فرحان',
        description: 'نظام محاسبي متكامل لإدارة المخزون والمبيعات',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        lang: 'ar',
        dir: 'rtl',
        categories: ['business', 'productivity', 'utilities'],
        icons: [
          {
            src: '/logo-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/logo-apple-touch.png',
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any'
          }
        ],
        shortcuts: [
          {
            name: 'إضافة صنف جديد',
            short_name: 'إضافة',
            description: 'إضافة صنف جديد للمخزون',
            url: '/inventory/add',
            icons: [{ src: '/logo-192x192.png', sizes: '96x96' }]
          },
          {
            name: 'بيع جديد',
            short_name: 'بيع',
            description: 'إنشاء فاتورة بيع جديدة',
            url: '/sales/new',
            icons: [{ src: '/logo-192x192.png', sizes: '96x96' }]
          }
        ],
        related_applications: [],
        prefer_related_applications: false
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/firestore\.googleapis\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'firestore-cache',
              networkTimeoutSeconds: 3,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/firebase': path.resolve(__dirname, './src/firebase')
    }
  },
  server: {
    host: true,
    port: 3000,
    hmr: {
      port: 3000,
      host: 'localhost'
    },
    watch: {
      usePolling: true
    }
  },
  build: {
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
          ui: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
        }
      }
    }
  },
  define: {
    global: 'globalThis',
  }
})