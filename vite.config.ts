import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Disable HMR WebSocket in middleware/proxy environment to prevent client WebSocket errors
      hmr: false as const,
      ws: false as const,
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
