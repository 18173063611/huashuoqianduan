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
  },
})
