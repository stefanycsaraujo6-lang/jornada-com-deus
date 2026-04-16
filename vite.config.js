// ── MODIFICAÇÃO: proxy local com Gemini API (gratuito) + PWA + server
// ── DATA: 2026-04-16
// ── TASK: TASK-03 (PWA) + TASK-08 (server) + migração Anthropic → Gemini
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const geminiKey = env.VITE_GEMINI_KEY

  const callGemini = async (version, modelName, payload) => {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${modelName}:generateContent`
    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': geminiKey
      },
      body: JSON.stringify(payload)
    })
    const text = await upstream.text()
    return { upstream, text }
  }

  return {
    plugins: [
      react(),
      {
        name: 'gemini-local-proxy',
        configureServer(server) {
          server.middlewares.use('/api/gemini', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Method Not Allowed' }))
              return
            }

            let body = ''
            req.on('data', (chunk) => (body += chunk))
            req.on('end', async () => {
              try {
                if (!geminiKey) {
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'VITE_GEMINI_KEY ausente. Defina em .env.local' }))
                  return
                }

                const { model, payload } = JSON.parse(body)
                const modelName = model || 'gemini-2.0-flash'

                let { upstream, text } = await callGemini('v1beta', modelName, payload)

                if (upstream.status === 404) {
                  // Alguns modelos ficam disponíveis apenas em uma versão da API.
                  const retry = await callGemini('v1', modelName, payload)
                  upstream = retry.upstream
                  text = retry.text
                }

                res.statusCode = upstream.status
                res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
                res.end(text)
              } catch (e) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: e?.message || 'Erro no proxy local' }))
              }
            })
          })
        }
      },
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png'],
        manifest: {
          name: 'Jornada com Deus',
          short_name: 'Jornada',
          description: 'Seu devocional diário. Consistência que transforma.',
          theme_color: '#080b18',
          background_color: '#080b18',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: { cacheName: 'google-fonts-cache' }
            }
          ]
        }
      })
    ],
    server: {
      host: true,
      port: 5173
    }
  }
})
