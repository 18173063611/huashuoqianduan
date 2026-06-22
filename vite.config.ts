import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'print-admin-url',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          const address = server.httpServer?.address()
          const port = typeof address === 'object' && address ? address.port : server.config.server.port
          const host = server.config.server.host === true ? 'localhost' : server.config.server.host || 'localhost'
          const origin = `http://${host}:${port}`

          console.log(`  ➜  Admin Login: ${origin}/admin/login`)
          console.log(`  ➜  Admin Site:  ${origin}/admin/dashboard`)
        })
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
