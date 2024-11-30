import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'pocketbase': path.resolve(__dirname, 'node_modules/pocketbase/dist/pocketbase.es.mjs')
    }
  },
  optimizeDeps: {
    include: ['pocketbase']
  }
})
