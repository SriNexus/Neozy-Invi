import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5555,
    strictPort: true,
    // bind to 0.0.0.0 so the dev server is reachable from a real phone
    // on the same LAN (e.g. http://<lan-ip>:5555/) — Vite defaults to
    // localhost-only, which a phone can never reach
    host: true,
  },
})
