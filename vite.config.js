import react from '@vitejs/plugin-react'
import { spawn } from 'child_process'
import { defineConfig } from 'vite'

function liveEdgeTtsPlugin() {
  return {
    name: 'live-edge-tts-server',
    configureServer(server) {
      server.middlewares.use('/api/tts', (req, res) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
          const text = url.searchParams.get('text') || ''
          const voice = url.searchParams.get('voice') || 'id-ID-ArdiNeural'

          if (!text) {
            res.statusCode = 400
            res.end('Missing text parameter')
            return
          }

          res.setHeader('Content-Type', 'audio/mpeg')
          res.setHeader('Cache-Control', 'no-cache')
          res.setHeader('Access-Control-Allow-Origin', '*')

          const proc = spawn('edge-tts', ['--voice', voice, '--text', text, '--write-media', '-'])

          proc.stdout.pipe(res)

          proc.stderr.on('data', (data) => {
            console.warn('[edge-tts warning]', data.toString())
          })

          proc.on('error', (err) => {
            console.error('[edge-tts process error]', err)
            if (!res.headersSent) {
              res.statusCode = 500
              res.end('TTS process error: ' + err.message)
            }
          })
        } catch (e) {
          console.error('[edge-tts handler error]', e)
          if (!res.headersSent) {
            res.statusCode = 500
            res.end('Internal error')
          }
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), liveEdgeTtsPlugin()],
  assetsInclude: ['**/*.lottie'],
})
