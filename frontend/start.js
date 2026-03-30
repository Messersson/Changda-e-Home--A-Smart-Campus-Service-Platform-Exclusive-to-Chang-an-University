import { createServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = resolve(__filename, '..')

const host = process.env.VITE_DEV_HOST || '0.0.0.0'
const port = Number(process.env.VITE_DEV_PORT) || 5173
const proxyTarget = process.env.VITE_PROXY_TARGET || 'http://localhost:3000'

async function start() {
  const server = await createServer({
    root: process.cwd(),
    plugins: [vue()],
    resolve: {
      alias: {
        '@': resolve(process.cwd(), 'src')
      }
    },
    server: {
      host,
      port,
      strictPort: false,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    }
  })

  await server.listen()
  server.printUrls()
}

start().catch((error) => {
  console.error('前端启动失败:', error)
  process.exit(1)
})
