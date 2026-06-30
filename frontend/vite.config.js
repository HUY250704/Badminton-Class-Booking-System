import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-logo.png', 'pwa-logo-192.png', 'pwa-logo-512.png'],
      manifest: {
        name: 'Lin-Badminton Class Booking',
        short_name: 'Lin-Badminton',
        description: 'Book badminton classes, manage enrollments, and track upcoming training sessions.',
        theme_color: '#a3e635',
        background_color: '#f7f9fb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/classes',
        scope: '/',
        icons: [
          {
            src: '/pwa-logo-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-logo-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-logo-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'lin-badminton-images',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            urlPattern: ({ url, request }) => url.pathname.startsWith('/api/') && request.method === 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'lin-badminton-api',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 10
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 3000
  }
});
