import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom: avoids the jsdom@29 / @exodus/bytes ESM conflict
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
  },
})
