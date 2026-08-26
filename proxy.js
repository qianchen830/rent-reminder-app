// Simple reverse proxy: serves Vite preview on :3003 and proxies /api to :3002
import { createServer } from 'http'
import { readFile } from 'fs/promises'
import { join, extname } from 'path'
import { existsSync } from 'fs'

const DIST_DIR = './dist'
const API_TARGET = 'http://localhost:3002'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

const server = createServer(async (req, res) => {
  const url = req.url || '/'

  if (url.startsWith('/api')) {
    // Read request body for POST/PUT/PATCH
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

  // Serve Vite preview dist
  let filePath = join(DIST_DIR, url === '/' ? 'index.html' : url)
  if (!existsSync(filePath)) {
    filePath = join(DIST_DIR, 'index.html')
  }

  try {
    const data = await readFile(filePath)
    const ext = extname(filePath).toLowerCase()
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
    res.end(data)
  } catch {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(3003, '0.0.0.0', () => {
  console.log('[proxy] Reverse proxy running at http://0.0.0.0:3003')
  console.log('[proxy] SPA on :3003, API proxied to :3002')
})
