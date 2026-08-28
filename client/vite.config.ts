import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Pulls VITE_* from .env[.mode][.local] as well as the real environment, so a
  // dev whose backend runs on a different port sets VITE_API_PROXY_TARGET in
  // client/.env.development.local (gitignored) instead of editing this file.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  return {
    plugins: [react()],
    // Local `npm run dev`/`preview` stay unprefixed ("/") since they bypass the
    // gateway and talk to the backend directly via the proxy below. The Docker
    // build sets VITE_BASE=/ats/ so the built bundle works behind the gateway,
    // which serves this app under that prefix (see Gorilla.Platform/deploy).
    base: env.VITE_BASE ?? '/',
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
        // host only, so the backend is never exposed to the network. Keep the
        // target on localhost/127.0.0.1 — that is what enforces the rule.
        '/api': {
          target: env.VITE_API_PROXY_TARGET ?? 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  }
})
