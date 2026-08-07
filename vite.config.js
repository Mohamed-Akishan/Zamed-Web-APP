// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,
    hmr: {
      overlay: true,
      // Fix for connection refused issues
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
    watch: {
      usePolling: false,
      interval: 1000,
    },
    // ============================================================
    // FIX: Add historyApiFallback for SPA routing
    // ============================================================
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'https://zamed-backend-1.onrender.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['react-icons', 'sonner', 'framer-motion'],
        }
      }
    },
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  }
})