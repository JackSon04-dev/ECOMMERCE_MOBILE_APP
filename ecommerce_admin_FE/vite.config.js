// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  server: {
    port: 3000, // Cổng chạy của Frontend
    open: true, // Tự động mở trình duyệt khi chạy npm run dev
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  plugins: [vue()]
})
