import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/azzzhBlog/',
  build: {
    // Expose the chunk graph for CI analysis without adding a runtime dependency.
    manifest: true,
  },
})
