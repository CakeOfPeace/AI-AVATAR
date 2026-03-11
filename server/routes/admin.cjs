const express = require('express')
const db = require('../db.cjs')
const { verifyToken, requireAdmin } = require('../middleware/auth.cjs')

const router = express.Router()

// Apply admin check to all routes
router.use(verifyToken)
router.use(requireAdmin)

// Get dashboard stats
router.get('/stats', async (req, res) => {
  try {
    // Total users
    const usersResult = await db.query('SELECT COUNT(*) FROM users')
    const totalUsers = parseInt(usersResult.rows[0].count)

    // Total avatars
    const avatarsResult = await db.query('SELECT COUNT(*) FROM avatars')
    const totalAvatars = parseInt(avatarsResult.rows[0].count)

    // Active avatars (with conversation_id)
    const activeAvatarsResult = await db.query(
      'SELECT COUNT(*) FROM avatars WHERE conversation_id IS NOT NULL'
    )
    const activeAvatars = parseInt(activeAvatarsResult.rows[0].count)

    // Pending change requests
    const pendingRequestsResult = await db.query(
      "SELECT COUNT(*) FROM change_requests WHERE status = 'pending'"
    )
    const pendingRequests = parseInt(pendingRequestsResult.rows[0].count)

    // Total call sessions this month
    const sessionsResult = await db.query(
      `SELECT COUNT(*), COALESCE(SUM(duration_seconds), 0) as total_duration
       FROM call_sessions
       WHERE started_at >= DATE_TRUNC('month', CURRENT_DATE)`
    )
    const totalSessions = parseInt(sessionsResult.rows[0].count)
    const totalMinutes = Math.round(parseInt(sessionsResult.rows[0].total_duration) / 60)

    // Recent activity (last 10 sessions)
    const recentActivity = await db.query(
      `SELECT cs.id, cs.started_at, cs.ended_at, cs.duration_seconds, cs.call_type,
              a.name as avatar_name, u.email as user_email
       FROM call_sessions cs
       LEFT JOIN avatars a ON cs.avatar_id = a.id
       LEFT JOIN users u ON cs.user_id = u.id
       ORDER BY cs.started_at DESC
       LIMIT 10`
    )

    res.json({
      stats: {
        totalUsers,
        totalAvatars,
        activeAvatars,
        pendingRequests,
        totalSessions,
        totalMinutes
      },
      recentActivity: recentActivity.rows
    })
  } catch (err) {
    console.error('Admin stats error:', err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// Get all users with EQUOS avatar, agent counts, and session usage
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.email, u.name, u.role, u.source, u.created_at, u.plain_password,
              (SELECT COUNT(*) FROM equos_avatars WHERE user_id = u.id) as avatar_count,
              (SELECT COUNT(*) FROM equos_agents WHERE user_id = u.id) as agent_count,
              (SELECT COUNT(*) FROM equos_session_logs WHERE user_id = u.id) as session_count,
              (SELECT COALESCE(SUM(duration_seconds), 0) FROM equos_session_logs WHERE user_id = u.id AND duration_seconds IS NOT NULL) as total_seconds
       FROM users u
       ORDER BY u.created_at DESC`
    )

    // Convert total_seconds to minutes for each user
    const users = result.rows.map(user => ({
      ...user,
      total_minutes: Math.round((parseInt(user.total_seconds) || 0) / 60)
    }))

    res.json({ users })
  } catch (err) {
    console.error('Get users error:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Reset user password (admin only)
router.post('/users/:id/reset-password', async (req, res) => {
  const bcrypt = require('bcrypt')
  const SALT_ROUNDS = 10
  
  try {
    // Generate random password
    const newPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase()
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS)
    
    const result = await db.query(
      `UPDATE users SET password_hash = $1, plain_password = $2 WHERE id = $3 
       RETURNING id, email, name`,
      [passwordHash, newPassword, req.params.id]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    res.json({ 
      message: 'Password reset successfully',
      user: result.rows[0],
      newPassword 
    })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: 'Failed to reset password' })
  }
})

// Valid account tiers/roles
const VALID_ROLES = ['free', 'starter', 'business', 'custom', 'admin']

// Update user role/tier
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}` })
    }

    const result = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role',
      [role, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ user: result.rows[0] })
  } catch (err) {
    console.error('Update user role error:', err)
    res.status(500).json({ error: 'Failed to update user role' })
  }
})

// Get all avatars (admin view)
router.get('/avatars', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.name, a.conversation_id, a.config, a.status, a.created_at,
              u.email as user_email, u.name as user_name
       FROM avatars a
       LEFT JOIN users u ON a.user_id = u.id
       ORDER BY a.created_at DESC`
    )

    res.json({ avatars: result.rows })
  } catch (err) {
    console.error('Get all avatars error:', err)
    res.status(500).json({ error: 'Failed to fetch avatars' })
  }
})

// Update avatar (admin - can update conversation_id and config)
router.put('/avatars/:id', async (req, res) => {
  try {
    const { name, conversationId, config, status } = req.body

    const result = await db.query(
      `UPDATE avatars
       SET name = COALESCE($1, name),
           conversation_id = COALESCE($2, conversation_id),
           config = COALESCE($3, config),
           status = COALESCE($4, status),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, conversation_id, config, status, created_at, updated_at`,
      [name, conversationId, config ? JSON.stringify(config) : null, status, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    res.json({ avatar: result.rows[0] })
  } catch (err) {
    console.error('Admin update avatar error:', err)
    res.status(500).json({ error: 'Failed to update avatar' })
  }
})

// Get all change requests
router.get('/change-requests', async (req, res) => {
  try {
    const { status } = req.query

    let query = `
      SELECT cr.id, cr.avatar_id, cr.requested_changes, cr.status, cr.admin_notes,
             cr.created_at, cr.resolved_at,
             a.name as avatar_name,
             u.email as user_email, u.name as user_name
      FROM change_requests cr
      LEFT JOIN avatars a ON cr.avatar_id = a.id
      LEFT JOIN users u ON cr.user_id = u.id
    `

    const params = []
    if (status) {
      query += ' WHERE cr.status = $1'
      params.push(status)
    }

    query += ' ORDER BY cr.created_at DESC'

    const result = await db.query(query, params)

    res.json({ changeRequests: result.rows })
  } catch (err) {
    console.error('Get change requests error:', err)
    res.status(500).json({ error: 'Failed to fetch change requests' })
  }
})

// Update change request status
router.put('/change-requests/:id', async (req, res) => {
  try {
    const { status, adminNotes } = req.body

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const resolvedAt = status !== 'pending' ? 'NOW()' : 'NULL'

    const result = await db.query(
      `UPDATE change_requests
       SET status = $1,
           admin_notes = COALESCE($2, admin_notes),
           resolved_at = ${resolvedAt}
       WHERE id = $3
       RETURNING id, avatar_id, requested_changes, status, admin_notes, created_at, resolved_at`,
      [status, adminNotes, req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' })
    }

    res.json({ changeRequest: result.rows[0] })
  } catch (err) {
    console.error('Update change request error:', err)
    res.status(500).json({ error: 'Failed to update change request' })
  }
})

// Delete user (admin)
router.delete('/users/:id', async (req, res) => {
  try {
    // Don't allow deleting self
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' })
    }

    const result = await db.query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ message: 'User deleted' })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: 'Failed to delete user' })
  }
})

// Activate avatar - calls Duix API to create the avatar
router.post('/avatars/:id/activate', async (req, res) => {
  try {
    // Get avatar from database
    const avatarResult = await db.query(
      'SELECT id, name, config, status FROM avatars WHERE id = $1',
      [req.params.id]
    )

    if (avatarResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    const avatar = avatarResult.rows[0]
    
    if (avatar.status === 'active') {
      return res.status(400).json({ error: 'Avatar is already active' })
    }

    const config = typeof avatar.config === 'string' ? JSON.parse(avatar.config) : avatar.config

    // Call Duix API to create avatar
    const https = require('https')
    const jwt = require('jsonwebtoken')

    const appId = process.env.VITE_DUIX_API_ID
    const appKey = process.env.VITE_DUIX_API_KEY

    if (!appId || !appKey) {
      return res.status(500).json({ error: 'Avatar API credentials not configured' })
    }

    // Generate token
    const token = jwt.sign({ appId }, appKey, { algorithm: 'HS256', expiresIn: '30m' })

    // Check for required avatar source BEFORE calling Duix API
    // Per Duix API docs: https://docs.duix.com/api-reference/create-avatar
    // Only coverImage (photo) is supported via API, NOT video
    const hasConversationId = config.conversationId && typeof config.conversationId === 'string' && config.conversationId.trim()
    const hasCoverImage = config.coverImage && typeof config.coverImage === 'string' && config.coverImage.startsWith('data:image')
    
    if (!hasConversationId && !hasCoverImage) {
      return res.status(400).json({ 
        error: 'Avatar creation requires either a library avatar selection (conversationId) or an uploaded photo (coverImage). This avatar was created without either - please delete it and create a new one with a proper source.',
        details: {
          hasConversationId: !!config.conversationId,
          hasCoverImage: !!config.coverImage,
          configKeys: Object.keys(config)
        }
      })
    }

    // Build Duix payload from avatar config
    // Per API docs: ttsName, conversationId, coverImage, defaultSpeakingLanguage, greetings, name, profile
    const duixPayload = {
      ttsName: config.ttsName || config.voiceId || 'Alloy',
      defaultSpeakingLanguage: config.defaultSpeakingLanguage || config.language || 'English',
      name: avatar.name
    }

    // Add conversationId if valid (library avatar - has full body movement)
    if (hasConversationId) {
      duixPayload.conversationId = config.conversationId
    }
    
    // Add coverImage if valid Base64 (custom photo avatar - mouth movement only)
    if (hasCoverImage) {
      duixPayload.coverImage = config.coverImage
    }
    
    if (config.greetings && typeof config.greetings === 'string') {
      duixPayload.greetings = config.greetings
    } else if (config.greeting && typeof config.greeting === 'string') {
      duixPayload.greetings = config.greeting
    }
    
    if (config.profile && typeof config.profile === 'string') {
      duixPayload.profile = config.profile
    } else if (config.systemPrompt && typeof config.systemPrompt === 'string') {
      duixPayload.profile = config.systemPrompt
    }

    console.log('Activating avatar with Duix:', { avatarId: avatar.id, name: avatar.name })

    // Make request to Duix API
    const duixResponse = await new Promise((resolve, reject) => {
      const postData = JSON.stringify(duixPayload)
      const options = {
        hostname: 'api-hk.duix.com',
        port: 443,
        path: '/duix-openapi-v2/sdk/v2/createAvatar',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
          'token': token
        },
        rejectUnauthorized: false
      }

      const req = https.request(options, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) })
          } catch {
            resolve({ status: res.statusCode, data: body })
          }
        })
      })

      req.on('error', reject)
      req.write(postData)
      req.end()
    })

    console.log('Duix API response:', duixResponse)

    // Duix API returns code: '0' for success, not '200'
    if (duixResponse.status !== 200 || !duixResponse.data.success) {
      return res.status(400).json({
        error: 'Failed to create avatar',
        details: duixResponse.data
      })
    }

    const taskId = duixResponse.data.data?.taskId

    // Avatar creation is async - store taskId and set status to 'processing'
    // The avatar will be ready once Duix finishes training (15-20 mins for custom photos)
    const updateResult = await db.query(
      `UPDATE avatars
       SET status = 'processing',
           conversation_id = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, conversation_id, config, status, created_at, updated_at`,
      [taskId, req.params.id]
    )

    res.json({
      success: true,
      avatar: updateResult.rows[0],
      taskId,
      message: 'Avatar creation started! Custom avatars take 15-20 minutes to process. Use the taskId to check status.'
    })
  } catch (err) {
    console.error('Activate avatar error:', err)
    res.status(500).json({ error: err.message || 'Failed to activate avatar' })
  }
})

// Check avatar creation status via Duix API
// API: https://docs.duix.com/api-reference/query-creation
router.get('/avatars/status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params
    const https = require('https')
    const jwt = require('jsonwebtoken')

    const appId = process.env.VITE_DUIX_API_ID
    const appKey = process.env.VITE_DUIX_API_KEY

    if (!appId || !appKey) {
      return res.status(500).json({ error: 'Avatar API credentials not configured' })
    }

    const token = jwt.sign({ appId }, appKey, { algorithm: 'HS256', expiresIn: '30m' })

    const duixResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api-hk.duix.com',
        port: 443,
        path: `/duix-openapi-v2/sdk/v2/queryAvatar?taskId=${taskId}`,
        method: 'GET',
        headers: {
          'token': token
        },
        rejectUnauthorized: false
      }

      const req = https.request(options, (res) => {
        let body = ''
        res.on('data', chunk => body += chunk)
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) })
          } catch {
            resolve({ status: res.statusCode, data: body })
          }
        })
      })

      req.on('error', reject)
      req.end()
    })

    console.log('Duix status check response:', duixResponse)

    if (!duixResponse.data.success) {
      return res.status(400).json({ error: 'Failed to check status', details: duixResponse.data })
    }

    const statusData = duixResponse.data.data

    // If avatar is done (status: 2), update local DB to 'active'
    // IMPORTANT: Use the ACTUAL conversationId from Duix response, not the taskId
    if (statusData?.status === 2 || statusData?.processingStep === 'done') {
      const realConversationId = statusData.conversationId
      
      if (realConversationId) {
        // Update avatar with the REAL conversation ID from Duix
        await db.query(
          `UPDATE avatars 
           SET status = 'active', 
               conversation_id = $1,
               updated_at = NOW() 
           WHERE conversation_id = $2`,
          [realConversationId, taskId]
        )
        console.log(`Avatar activated with real conversationId: ${realConversationId} (was taskId: ${taskId})`)
      } else {
        // Fallback - just mark as active
        await db.query(
          `UPDATE avatars SET status = 'active', updated_at = NOW() 
           WHERE conversation_id = $1`,
          [taskId]
        )
      }
    }

    res.json(statusData)
  } catch (err) {
    console.error('Check avatar status error:', err)
    res.status(500).json({ error: err.message || 'Failed to check status' })
  }
})

// Delete avatar (admin)
router.delete('/avatars/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM avatars WHERE id = $1 RETURNING id',
      [req.params.id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    res.json({ message: 'Avatar deleted' })
  } catch (err) {
    console.error('Admin delete avatar error:', err)
    res.status(500).json({ error: 'Failed to delete avatar' })
  }
})

module.exports = router
