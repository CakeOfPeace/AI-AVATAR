const db = require('../db.cjs')
const { hashKey } = require('../lib/apiKeys.cjs')

const validateApiKey = async (req, res, next) => {
  const apiKey = req.header('x-api-key')
  
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' })
  }
  
  try {
    const hashedKey = hashKey(apiKey)
    
    // Find key and associated user
    const result = await db.query(
      `SELECT k.id as key_id, k.user_id, u.role, u.name, u.email 
       FROM api_keys k
       JOIN users u ON k.user_id = u.id
       WHERE k.key_hash = $1`,
      [hashedKey]
    )
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API key' })
    }
    
    const { key_id, user_id, role, name, email } = result.rows[0]
    
    // Update last used timestamp (async, don't await)
    db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [key_id])
      .catch(err => console.error('Failed to update api key stats:', err))
    
    // Attach user to request
    req.user = { id: user_id, role, name, email }
    req.apiKeyId = key_id
    
    next()
  } catch (err) {
    console.error('API key validation error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
}

module.exports = { validateApiKey }
