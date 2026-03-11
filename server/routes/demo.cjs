const express = require('express')
const { equosRequest } = require('../lib/equosClient.cjs')

const router = express.Router()

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Firuzeh@2026'
const FIRUZEH_AVATAR_IDENTITY = 'avatar-farzad-mmkb7qry'

let cachedAvatarId = null

async function resolveAvatarId() {
  if (cachedAvatarId) return cachedAvatarId

  const result = await equosRequest('GET', '/v1/avatars?take=100&skip=0')
  if (!result.ok) {
    throw new Error('Failed to fetch avatars from EQUOS')
  }

  const avatars = result.data.avatars || []
  const match = avatars.find(a =>
    a.identity === FIRUZEH_AVATAR_IDENTITY || a.id === FIRUZEH_AVATAR_IDENTITY
  )

  if (!match) {
    throw new Error(`Avatar "${FIRUZEH_AVATAR_IDENTITY}" not found`)
  }

  cachedAvatarId = { id: match.id, agentId: match.agentId, name: match.name }
  console.log('[Demo] Resolved avatar:', cachedAvatarId)
  return cachedAvatarId
}

router.post('/verify', (req, res) => {
  const { password } = req.body
  if (!password) {
    return res.status(400).json({ error: 'Password required' })
  }

  if (password !== DEMO_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' })
  }

  const token = Buffer.from(`demo:${Date.now()}:${DEMO_PASSWORD}`).toString('base64')
  res.json({ success: true, token })
})

function verifyDemoToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const token = authHeader.split(' ')[1]
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const parts = decoded.split(':')
    if (parts[0] !== 'demo' || parts[2] !== DEMO_PASSWORD) {
      return res.status(401).json({ error: 'Invalid token' })
    }
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

router.post('/session', verifyDemoToken, async (req, res) => {
  try {
    const avatar = await resolveAvatarId()

    const sessionData = {
      name: `Firuzeh Demo ${Date.now()}`,
      avatar: { id: avatar.id },
      ...(avatar.agentId && { agent: { id: avatar.agentId } }),
      maxDuration: 300,
      consumerIdentity: {
        identity: `demo-visitor-${Date.now()}`,
        name: 'Restaurant Visitor'
      }
    }

    console.log('[Demo] Starting session:', JSON.stringify(sessionData, null, 2))
    const result = await equosRequest('POST', '/v1/sessions', sessionData)

    if (!result.ok) {
      console.error('[Demo] Session creation failed:', result.data)
      return res.status(result.status).json({
        error: 'Failed to start session',
        details: result.data
      })
    }

    const session = result.data.session
    res.json({
      sessionId: session.id,
      serverUrl: session.host.serverUrl,
      token: result.data.consumerAccessToken,
      avatarName: session.avatar?.name || avatar.name
    })
  } catch (error) {
    console.error('[Demo] Session error:', error)
    res.status(500).json({ error: error.message })
  }
})

router.post('/session/:id/stop', verifyDemoToken, async (req, res) => {
  try {
    const { id } = req.params
    const result = await equosRequest('PATCH', `/v1/sessions/${id}/stop`)

    if (!result.ok) {
      return res.status(result.status).json({ error: 'Failed to stop session' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('[Demo] Stop session error:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
