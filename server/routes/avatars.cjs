const express = require('express')
const db = require('../db.cjs')
const { verifyToken } = require('../middleware/auth.cjs')

const router = express.Router()

// Get all avatars for current user
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, conversation_id, config, status, created_at, updated_at
       FROM avatars
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    )

    res.json({ avatars: result.rows })
  } catch (err) {
    console.error('Get avatars error:', err)
    res.status(500).json({ error: 'Failed to fetch avatars' })
  }
})

// Get single avatar
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, conversation_id, config, status, created_at, updated_at
       FROM avatars
       WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    res.json({ avatar: result.rows[0] })
  } catch (err) {
    console.error('Get avatar error:', err)
    res.status(500).json({ error: 'Failed to fetch avatar' })
  }
})

// Create new avatar
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, config } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Avatar name is required' })
    }

    // Validate config object
    const avatarConfig = {
      systemPrompt: config?.systemPrompt || '',
      language: config?.language || 'en',
      greeting: config?.greeting || '',
      voiceId: config?.voiceId || '',
      llmProvider: config?.llmProvider || 'openai',
      vadSilenceTime: config?.vadSilenceTime || 800,
      ...config
    }

    const result = await db.query(
      `INSERT INTO avatars (user_id, name, config, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING id, name, conversation_id, config, status, created_at, updated_at`,
      [req.user.id, name, JSON.stringify(avatarConfig)]
    )

    res.status(201).json({ avatar: result.rows[0] })
  } catch (err) {
    console.error('Create avatar error:', err)
    res.status(500).json({ error: 'Failed to create avatar' })
  }
})

// Update avatar (limited fields for users)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { name } = req.body

    // Users can only update avatar name
    // Config changes require change request
    const result = await db.query(
      `UPDATE avatars
       SET name = COALESCE($1, name), updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING id, name, conversation_id, config, status, created_at, updated_at`,
      [name, req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    res.json({ avatar: result.rows[0] })
  } catch (err) {
    console.error('Update avatar error:', err)
    res.status(500).json({ error: 'Failed to update avatar' })
  }
})

// Delete avatar
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM avatars WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    res.json({ message: 'Avatar deleted' })
  } catch (err) {
    console.error('Delete avatar error:', err)
    res.status(500).json({ error: 'Failed to delete avatar' })
  }
})

// Submit change request for avatar
router.post('/:id/change-request', verifyToken, async (req, res) => {
  try {
    const { requestedChanges } = req.body

    if (!requestedChanges) {
      return res.status(400).json({ error: 'Requested changes are required' })
    }

    // Verify avatar belongs to user
    const avatar = await db.query(
      'SELECT id FROM avatars WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )

    if (avatar.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    const result = await db.query(
      `INSERT INTO change_requests (avatar_id, user_id, requested_changes)
       VALUES ($1, $2, $3)
       RETURNING id, avatar_id, requested_changes, status, created_at`,
      [req.params.id, req.user.id, requestedChanges]
    )

    res.status(201).json({ changeRequest: result.rows[0] })
  } catch (err) {
    console.error('Create change request error:', err)
    res.status(500).json({ error: 'Failed to submit change request' })
  }
})

// Get change requests for user's avatars
router.get('/:id/change-requests', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT cr.id, cr.avatar_id, cr.requested_changes, cr.status, cr.admin_notes, cr.created_at, cr.resolved_at
       FROM change_requests cr
       JOIN avatars a ON cr.avatar_id = a.id
       WHERE cr.avatar_id = $1 AND a.user_id = $2
       ORDER BY cr.created_at DESC`,
      [req.params.id, req.user.id]
    )

    res.json({ changeRequests: result.rows })
  } catch (err) {
    console.error('Get change requests error:', err)
    res.status(500).json({ error: 'Failed to fetch change requests' })
  }
})

// Log session start
router.post('/:id/session/start', verifyToken, async (req, res) => {
  try {
    const { callType } = req.body

    // Verify avatar belongs to user or is accessible
    const avatar = await db.query(
      'SELECT id FROM avatars WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )

    if (avatar.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    const result = await db.query(
      `INSERT INTO call_sessions (avatar_id, user_id, call_type)
       VALUES ($1, $2, $3)
       RETURNING id, avatar_id, started_at, call_type`,
      [req.params.id, req.user.id, callType || 'duix']
    )

    res.status(201).json({ session: result.rows[0] })
  } catch (err) {
    console.error('Session start error:', err)
    res.status(500).json({ error: 'Failed to log session start' })
  }
})

// Log session end
router.post('/session/:sessionId/end', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE call_sessions
       SET ended_at = NOW(),
           duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER
       WHERE id = $1 AND user_id = $2
       RETURNING id, avatar_id, started_at, ended_at, duration_seconds, call_type`,
      [req.params.sessionId, req.user.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json({ session: result.rows[0] })
  } catch (err) {
    console.error('Session end error:', err)
    res.status(500).json({ error: 'Failed to log session end' })
  }
})

module.exports = router
