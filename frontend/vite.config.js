import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // Assume running from frontend directory
  const envDir = path.resolve(process.cwd(), '..')
  const env = loadEnv(mode, envDir, '')

  return {
    envDir, // Tell Vite to look for .env files in the project root
    plugins: [
      react(),
      {
        name: 'html-transform',
        transformIndexHtml(html) {
          return html.replace(/%VITE_ESA_PREFIX%/g, env.VITE_ESA_PREFIX || '')
        },
      }
    ],
    server: {
      host: '0.0.0.0',
      port: 3000,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || env.REACT_APP_API_URL || 'http://localhost:8000',
          changeOrigin: true,
        }
      }
    },
    build: {
      outDir: 'build'
    }
  }
})
