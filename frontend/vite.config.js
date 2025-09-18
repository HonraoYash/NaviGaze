import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/frontend_build', // Build directly to backend folder
    emptyOutDir: true, // Clean the folder before building
  },
  server: {
    proxy: {
      '/build-graph': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/generate-map': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      },
      '/static': {
        target: 'http://localhost:5001',
        changeOrigin: true,
      }
    }
  }
});
