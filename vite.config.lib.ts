import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/browser.ts'),
      name: 'FavCRM',
      fileName: 'favcrm-sdk',
      formats: ['es', 'iife'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: true,
  },
});
