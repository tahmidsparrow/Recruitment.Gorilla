import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
  server: {
    host: true, // expose the dev server on the LAN (other PCs reach the frontend)
    proxy: {
      // Browser calls same-origin /api; Vite forwards to the backend on this
      // host only, so the backend (port 5000) is never exposed to the network.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
