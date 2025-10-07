import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// const path = require('path');

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // Listens on all network interfaces
    port: 3000,
    watch: {
      usePolling: true, // Essential for file changes in Docker
    },
  },
  plugins: [
    react(),     
    tailwindcss(),
  ],
  // base: '/src/',
  // resolve: {
  //   alias: {
  //     '@': path.resolve(__dirname, 'src'),
  //     '@components': path.resolve(__dirname, 'src/components'),
  //   },
  // }
});
