const react = require('@vitejs/plugin-react').default
const tailwindcss = require('@tailwindcss/vite').default

module.exports = {
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
  optimizeDeps: {
    // Keep cold starts quick and predictable; only prebundle React's CJS entry points.
    noDiscovery: true,
    include: ['react', 'react-dom/client'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor'
          }
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark-gfm') || id.includes('node_modules/micromark')) {
            return 'markdown'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons'
          }
        },
      },
    },
  },
}
