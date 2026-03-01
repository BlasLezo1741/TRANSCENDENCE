import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    host: '0.0.0.0',       // Permite escuchar dentro de la red de Docker
    port: 5173,
    hmr: {
      clientPort: 443,     // Engaña al navegador para que pase por Nginx
      protocol: 'wss',     // Usa WebSockets Seguros
      // host: 'localhost' // Descomenta esto solo si sigues teniendo error de WebSocket
    }
  }
})
