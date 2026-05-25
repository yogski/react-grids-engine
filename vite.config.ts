import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const DEFAULT_PORT = 6483

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT ?? DEFAULT_PORT),
  },
  test: {
    // Use happy-dom: avoids the jsdom@29 / @exodus/bytes ESM conflict
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
  },
})
