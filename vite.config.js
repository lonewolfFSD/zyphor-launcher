import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Electron loads the built index.html via file://, so every asset
// reference must be relative — an absolute base ('/') resolves to the
// filesystem root and breaks the packaged app.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
