import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'logo-192.png', 'logo-512.png', 'robots.txt'],
      manifest: {
        id: "/",
        short_name: "Accountize",
        name: "Accountize — Personal Finance Tracker",
        description: "Accountize — Personal finance tracker with receivables, payables, daily expenses, and fault detection.",
        start_url: "/",
        background_color: "#f8fafc",
        theme_color: "#6366f1",
        display: "standalone",
        orientation: "any",
        categories: ["finance", "productivity"],
        icons: [
          {
            src: "/logo-192.png",
            type: "image/png",
            sizes: "192x192",
            purpose: "any maskable"
          },
          {
            src: "/logo-512.png",
            type: "image/png",
            sizes: "512x512",
            purpose: "any maskable"
          },
          {
            src: "/logo.svg",
            type: "image/svg+xml",
            sizes: "any"
          }
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            url: "/",
            icons: [{ src: "/logo-192.png", sizes: "192x192" }]
          },
          {
            name: "Transactions",
            short_name: "Transactions",
            url: "/transactions",
            icons: [{ src: "/logo-192.png", sizes: "192x192" }]
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Serve index.html for all navigation requests (SPA client-side routing)
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/shared\//],
        // Cache Google Fonts and Supabase API requests at runtime
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 24 * 60 * 60 },
              networkTimeoutSeconds: 5
            }
          }
        ]
      }
    })
  ],
  build: {
    target: 'esnext',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  }
})
