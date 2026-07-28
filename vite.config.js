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
        short_name: "Accountify",
        name: "Accountify — Personal Finance Tracker",
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
            sizes: "any",
            purpose: "any maskable"
          }
        ],
        start_url: "/",
        background_color: "#f8fafc",
        display: "standalone",
        theme_color: "#6366f1",
        description: "Accountify — Personal finance tracker with receivables, payables, daily expenses, and fault detection."
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
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
