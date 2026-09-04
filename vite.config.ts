import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [react(), ...mode === 'android' ? [] : [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'MiRecibo',
        short_name: 'MiRecibo',
        description: 'Lista de compra, tickets, precios y repostajes.',
        theme_color: '#079455',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }
        ]
      }
    })]
  ],
  server: {
    host: '0.0.0.0',
    port: 4173,
    watch: { ignored: ['**/android/**', '**/*.apk'] }
  }
}));
