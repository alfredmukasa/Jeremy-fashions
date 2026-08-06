import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4242',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/api': {
        target: 'http://localhost:4242',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Split large, rarely-changing vendor code into its own cacheable chunks so a
    // returning visitor re-downloads only the small app chunk, and so the browser can
    // fetch these in parallel instead of waiting on one huge bundle on first load.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          if (/[\\/]react(-dom)?[\\/]|[\\/]react-router(-dom)?[\\/]|[\\/]scheduler[\\/]/.test(id)) {
            return 'vendor-react'
          }
          if (id.includes('framer-motion')) return 'vendor-motion'
          if (id.includes('@supabase')) return 'vendor-supabase'
          if (id.includes('@stripe')) return 'vendor-stripe'
          if (/[\\/](@tanstack|zustand)[\\/]/.test(id)) return 'vendor-state'
          if (/[\\/](react-hook-form|@hookform|zod)[\\/]/.test(id)) return 'vendor-forms'
          if (id.includes('react-icons')) return 'vendor-icons'
          return 'vendor'
        },
      },
    },
  },
})