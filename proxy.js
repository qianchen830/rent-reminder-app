// Combined server: serves Vite dist + API proxy + APK on port 3310
import { createServer } from 'http'
import { readFileSync } from 'fs'
import { join, extname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST_DIR = join(__dirname, 'dist')
const API_TARGET = 'http://localhost:3002'
const APK_DIR = join(__dirname, 'android', 'app', 'build', 'outputs', 'apk', 'debug')
const PORT = 3310

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.apk': 'application/vnd.android.package-archive',
}

const server = createServer(async (req, res) => {
  const url = req.url || '/'

  if (url.startsWith('/api')) {
    // Proxy to backend API
    const bodyChunks = []
    for await (const chunk of req) {
      bodyChunks.push(chunk)
    }
    const rawBody = Buffer.concat(bodyChunks)

    const opts = {
      method: req.method,
      headers: { ...req.headers, host: 'localhost:3002' },
    }
    if (rawBody.length > 0) {
      opts.body = rawBody
    }

    try {
      const proxied = await fetch(API_TARGET + url, opts)
      const proxiedBody = await proxied.arrayBuffer()
      res.writeHead(proxied.status, {
        ...Object.fromEntries(proxied.headers.entries()),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      })
      res.end(Buffer.from(proxiedBody))
    } catch (e) {
      res.writeHead(502)
      res.end('Backend unavailable')
    }
    return
  }

  // Serve APK if requested
  // Strip query string for file-system lookups
  const urlPath = url.split('?')[0]

  if (urlPath.endsWith('.apk')) {
    const apkPath = join(APK_DIR, urlPath.split('/').pop())
    if (existsSync(apkPath)) {
      try {
        const data = readFileSync(apkPath)
        res.writeHead(200, {
          'Content-Type': 'application/vnd.android.package-archive',
          'Content-Length': data.length,
          'Content-Disposition': 'attachment; filename="' + urlPath.split('/').pop() + '"',
        })
        res.end(data)
        return
      } catch {
        res.writeHead(500)
        res.end('APK read error')
        return
      }
    } else {
      res.writeHead(404)
      res.end('APK not found')
      return
    }
  }

  // Serve static files (SPA fallback)
  let filePath = join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath)
  if (!existsSync(filePath)) {
    filePath = join(DIST_DIR, 'index.html')
  }

  try {
    const data = readFileSync(filePath)
    const ext = extname(filePath).toLowerCase()
    const isIndex = filePath.endsWith('index.html')
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache, no-store',
    })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Running at http://0.0.0.0:${PORT}`)
  console.log(`[server] SPA + API proxy + APK download`)
  console.log(`[server] DIST_DIR=${DIST_DIR}`)
  console.log(`[server] APK_DIR=${APK_DIR}`)
})
