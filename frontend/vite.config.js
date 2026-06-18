import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// إعداد Vite الأساسي + بروكسي لكل طلبات /api تتجه مباشرة لـ FastAPI
// على بورت 8000، وده بيوفر علينا التعامل مع CORS في التطوير المحلي
// (مع إنه FastAPI عندنا فعّل CORS بالفعل في config.py، لكن البروكسي
// أنظف ويسهل النشر لاحقاً لو الباك إند والفرونت إند على نفس الدومين).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
})
