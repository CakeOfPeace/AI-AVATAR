require('dotenv').config()

const express = require('express')
const path = require('path')
const { createProxyMiddleware } = require('http-proxy-middleware')

// Import routes
const authRoutes = require('./routes/auth.cjs')
const avatarsRoutes = require('./routes/avatars.cjs')
const adminRoutes = require('./routes/admin.cjs')
const equosRoutes = require('./routes/equos.cjs')
const apiKeysRoutes = require('./routes/apikeys.cjs')
const externalRoutes = require('./routes/external.cjs')
const demoRoutes = require('./routes/demo.cjs')

const app = express()
const PORT = process.env.PORT || 5173

// Middleware - increase limit for Base64 image uploads
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// CORS headers for API
app.use('/api', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/avatars', avatarsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/equos', equosRoutes)
app.use('/api/keys', apiKeysRoutes)
app.use('/api/v1', externalRoutes)
app.use('/api/demo', demoRoutes)

// Proxy voice.zainlee.com API requests (for LiveKit avatar)
app.use('/api/playground', createProxyMiddleware({
  target: 'https://voice.zainlee.com',
  changeOrigin: true,
  secure: true,
  pathRewrite: (path) => `/api/playground${path.replace('/api/playground', '')}`,
  onProxyReq: (proxyReq, req) => {
    console.log(`[Proxy] ${req.method} ${req.url} -> https://voice.zainlee.com${req.url}`)
  },
  onError: (err, req, res) => {
    console.error('[Proxy Error]', err.message)
    res.status(502).json({ error: 'Proxy error', message: err.message })
  }
}))

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '..', 'dist')))

// Handle SPA routing - serve index.html for all non-API routes
app.use((req, res, next) => {
  // Skip actual API routes (those starting with /api/ not just /api)
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'))
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Avatar Dashboard running on port ${PORT}`)
  console.log(`http://localhost:${PORT}`)
  console.log('API endpoints:')
  console.log('  /api/auth     - Authentication')
  console.log('  /api/avatars  - Avatar management')
  console.log('  /api/admin    - Admin panel')
  console.log('  /api/equos    - EQUOS AI API')
  console.log('  /api/keys     - API Keys')
  console.log('  /api/v1       - External API')
  console.log('  /api/demo     - Demo sessions')
})
