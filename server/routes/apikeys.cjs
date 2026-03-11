const express = require('express')
const db = require('../db.cjs')
const { verifyToken } = require('../middleware/auth.cjs')
const { generateApiKey } = require('../lib/apiKeys.cjs')

const router = express.Router()

// List API keys
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, key_prefix, last_used_at, created_at 
       FROM api_keys 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.id]
    )
    res.json({ apiKeys: result.rows })
  } catch (err) {
    console.error('List API keys error:', err)
    res.status(500).json({ error: 'Failed to list API keys' })
  }
})

// Create API key
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name } = req.body
    
    if (!name) {
      return res.status(400).json({ error: 'Key name is required' })
    }
    
    const { key, hash, prefix } = generateApiKey()
    
    const result = await db.query(
      `INSERT INTO api_keys (user_id, name, key_prefix, key_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, key_prefix, created_at`,
      [req.user.id, name, prefix, hash]
    )
    
    // Return the full key ONLY ONCE upon creation
    res.status(201).json({ 
      apiKey: {
        ...result.rows[0],
        key: key // This is the only time the full key is returned
      }
    })
  } catch (err) {
    console.error('Create API key error:', err)
    res.status(500).json({ error: 'Failed to create API key' })
  }
})

// Delete/Revoke API key
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM api_keys WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'API key not found' })
    }
    
    res.json({ message: 'API key revoked' })
  } catch (err) {
    console.error('Revoke API key error:', err)
    res.status(500).json({ error: 'Failed to revoke API key' })
  }
})

module.exports = router
