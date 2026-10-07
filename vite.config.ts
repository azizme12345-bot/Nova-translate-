import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['apple-touch-icon.png', 'icon.svg'],
        manifest: false, // Using public/manifest.webmanifest
        devOptions: {
          enabled: true,
          type: 'module',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Configure HMR client port or disable HMR when running in AI Studio dev environment
      hmr: process.env.DISABLE_HMR === 'true' ? false : { clientPort: 443 },
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
