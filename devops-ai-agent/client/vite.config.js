import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 56533,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:50539',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:50539',
        changeOrigin: true,
        ws: true
      }
    }
  }
})
