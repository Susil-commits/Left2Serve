import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    visualizer({ filename: 'stats-before.html' })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})