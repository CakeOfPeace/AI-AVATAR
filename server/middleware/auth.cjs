const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const db = require('../db.cjs')

const JWT_SECRET = process.env.JWT_SECRET || 'avatar-dashboard-secret-key-change-in-production'

// Hash an API key for comparison
const hashApiKey = (key) => {
  return crypto.createHash('sha256').update(key).digest('hex')
}

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, JWT_SECRET)

    // Get user from database
    const result = await db.query(
      'SELECT id, email, name, role, created_at FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' })
    }

    req.user = result.rows[0]
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' })
    }
    console.error('Auth middleware error:', err)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}

// Verify API key (for external system integration)
const verifyApiKey = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const apiKeyHeader = req.headers['x-api-key']
    
    // Check for API key in x-api-key header or Authorization header
    let apiKey = apiKeyHeader
    if (!apiKey && authHeader && authHeader.startsWith('Bearer sk_')) {
      apiKey = authHeader.split(' ')[1]
    }
    
    if (!apiKey || !apiKey.startsWith('sk_')) {
      return res.status(401).json({ error: 'Invalid or missing API key' })
    }
    
    // Hash the key and look it up
    const keyHash = hashApiKey(apiKey)
    const result = await db.query(
      `SELECT ak.id as key_id, ak.user_id, ak.name as key_name, 
              u.id, u.email, u.name, u.role, u.created_at
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.key_hash = $1`,
      [keyHash]
    )
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' })
    }
    
    // Update last used timestamp
    await db.query(
      'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
      [result.rows[0].key_id]
    )
    
    req.user = {
      id: result.rows[0].user_id,
      email: result.rows[0].email,
      name: result.rows[0].name,
      role: result.rows[0].role,
      created_at: result.rows[0].created_at
    }
    req.apiKey = {
      id: result.rows[0].key_id,
      name: result.rows[0].key_name
    }
    
    next()
  } catch (err) {
    console.error('API key auth error:', err)
    return res.status(500).json({ error: 'Authentication failed' })
  }
}

// Check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' })
}

module.exports = {
  verifyToken,
  verifyApiKey,
  requireAdmin,
  generateToken,
  JWT_SECRET
}
