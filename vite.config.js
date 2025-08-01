import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: './src/renderer',
  base: './',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
      rollupOptions: {
      input: {
        main: path.resolve(__dirname, './src/renderer/index.html'),
        preload: path.resolve(__dirname, './src/preload/preload.js')
      },
      output: {
        entryFileNames: '[name].js'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
