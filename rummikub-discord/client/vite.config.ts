import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    host: '0.0.0.0',
    allowedHosts: [
      'followed-boots-burner-scoop.trycloudflare.com',  // ← New URL
      '.trycloudflare.com',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true,
      },
    },
    hmr: {
      clientPort: 443,
    },
  },
  build: {
    outDir: 'dist',
  },
});