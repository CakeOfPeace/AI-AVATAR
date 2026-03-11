const express = require('express')
const db = require('../db.cjs')
const { validateApiKey } = require('../middleware/externalAuth.cjs')
const { equosRequest } = require('../lib/equosClient.cjs')

const router = express.Router()

const MAX_INSTRUCTIONS_LENGTH = 5500

// Helper to sanitize response (remove internal fields if needed)
const sanitizeAvatar = (avatar) => {
  // Pass through for now, can filter fields if strictly required
  return avatar
}

const sanitizeAgent = (agent) => {
  return agent
}

// ========================================
// DEBUG ENDPOINT - Compare session creation
// ========================================

// GET /v1/debug/compare-session/:avatarId - Debug endpoint to compare session data
router.get('/debug/compare-session/:avatarId', validateApiKey, async (req, res) => {
  try {
    const { avatarId } = req.params
    const userId = req.user.id
    const user = req.user

    // Get local data
    const ownershipResult = await db.query(
      'SELECT ea.*, ag.provider, ag.model, ag.voice, ag.search, ag.emotions, ag.memory, ag.vision, LENGTH(ag.instructions) as instructions_length FROM equos_avatars ea LEFT JOIN equos_agents ag ON ea.agent_id = ag.equos_id WHERE ea.equos_id = $1 AND ea.user_id = $2',
      [avatarId, userId]
    )

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    const localData = ownershipResult.rows[0]

    // Fetch from EQUOS
    const equosAvatarResult = await equosRequest('GET', `/v1/avatars/${avatarId}`)

    // Build what would be sent for session creation
    const identity = {
      identity: `api-user-${userId}-${Date.now()}`,
      name: user.name || user.email || 'API User'
    }

    const sessionDataThatWouldBeSent = {
      name: 'Debug Test Session',
      avatar: { id: avatarId },
      consumerIdentity: identity,
      ...(localData.agent_id && { agent: { id: localData.agent_id } })
    }

    res.json({
      debug: true,
      message: 'This shows what data would be sent to EQUOS for session creation',
      local_database: {
        avatar_id: localData.equos_id,
        avatar_name: localData.name,
        agent_id: localData.agent_id,
        agent_provider: localData.provider,
        agent_model: localData.model,
        agent_voice: localData.voice,
        agent_search: localData.search,
        agent_emotions: localData.emotions,
        agent_memory: localData.memory,
        agent_vision: localData.vision,
        instructions_length: localData.instructions_length
      },
      equos_api_response: equosAvatarResult.ok ? {
        avatar_id: equosAvatarResult.data?.id,
        avatar_name: equosAvatarResult.data?.name,
        agent_id: equosAvatarResult.data?.agentId,
        agent: equosAvatarResult.data?.agent
      } : { error: 'Failed to fetch from EQUOS', status: equosAvatarResult.status },
      session_data_to_be_sent: sessionDataThatWouldBeSent,
      note: 'Compare agent_id and agent settings between local_database and equos_api_response'
    })
  } catch (error) {
    console.error('Debug compare error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ========================================
// AVATARS
// ========================================

// GET /v1/avatars - List avatars (mounted at /api/v1/avatars)
router.get('/avatars', validateApiKey, async (req, res) => {
  try {
    const { take = 50, skip = 0 } = req.query
    const userId = req.user.id

    // Fetch all avatars from provider
    const result = await equosRequest('GET', `/v1/avatars?take=${take}&skip=${skip}`)
    
    if (!result.ok) {
      return res.status(result.status).json({ error: 'Failed to fetch avatars' })
    }

    const allAvatars = result.data.avatars || []

    // Get local ownership info with agent vision data
    const localAvatarsResult = await db.query(`
      SELECT ea.equos_id, ea.agent_id, ag.vision as agent_vision
      FROM equos_avatars ea
      LEFT JOIN equos_agents ag ON ea.agent_id = ag.equos_id
      WHERE ea.user_id = $1
    `, [userId])
    
    const userAvatarMap = {}
    localAvatarsResult.rows.forEach(row => {
      userAvatarMap[row.equos_id] = {
        agentVision: row.agent_vision
      }
    })

    // Filter avatars belonging to user and enrich with local vision data
    const userAvatars = allAvatars
      .filter(avatar => userAvatarMap[avatar.id])
      .map(avatar => {
        const localData = userAvatarMap[avatar.id]
        return {
          ...avatar,
          agent: avatar.agent ? {
            ...avatar.agent,
            vision: localData.agentVision ?? avatar.agent?.vision ?? false
          } : avatar.agent
        }
      })

    res.json({
      data: userAvatars.map(sanitizeAvatar),
      meta: {
        total: userAvatars.length,
        take: parseInt(take),
        skip: parseInt(skip)
      }
    })
  } catch (error) {
    console.error('External API list avatars error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /v1/avatars/:id - Get avatar details
router.get('/avatars/:id', validateApiKey, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Check ownership and get local data including agent info
    const ownershipResult = await db.query(`
      SELECT ea.user_id, ea.agent_id, ag.vision as agent_vision
      FROM equos_avatars ea
      LEFT JOIN equos_agents ag ON ea.agent_id = ag.equos_id
      WHERE ea.equos_id = $1 AND ea.user_id = $2
    `, [id, userId])

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    const localData = ownershipResult.rows[0]

    const result = await equosRequest('GET', `/v1/avatars/${id}`)
    
    if (!result.ok) {
      return res.status(result.status).json({ error: 'Avatar not found' })
    }

    // Enrich response with local data (vision may not be returned by EQUOS)
    const enrichedAvatar = {
      ...result.data,
      agent: result.data.agent ? {
        ...result.data.agent,
        vision: localData.agent_vision ?? result.data.agent?.vision ?? false
      } : result.data.agent
    }

    res.json({ data: sanitizeAvatar(enrichedAvatar) })
  } catch (error) {
    console.error('External API get avatar error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Default Gemini settings
const DEFAULT_PROVIDER = 'gemini'
const DEFAULT_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025'
const DEFAULT_VOICE = 'Puck'

// POST /v1/avatars - Create avatar (Combined flow)
router.post('/avatars', validateApiKey, async (req, res) => {
  try {
    const userId = req.user.id
    const { 
      name, refImage, identity,
      voice, instructions, greetingMsg, 
      search, emotions, memory, vision
    } = req.body

    // Validate required fields - provider is always Gemini now
    if (!name || !refImage) {
      return res.status(400).json({ error: 'name and refImage are required' })
    }

    if (instructions && instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      return res.status(400).json({ 
        error: `Instructions exceed maximum length of ${MAX_INSTRUCTIONS_LENGTH} characters` 
      })
    }

    // Step 1: Create agent - always use Gemini defaults
    const agentData = {
      name,
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      voice: voice || DEFAULT_VOICE,
      instructions,
      greetingMsg,
      search: !!search,
      emotions: !!emotions,
      memory: !!memory,
      vision: !!vision
    }
    
    const agentResult = await equosRequest('POST', '/v1/agents', agentData)
    
    if (!agentResult.ok) {
      const equosError = agentResult.data?.message || agentResult.data?.error || 'Failed to create agent'
      return res.status(agentResult.status).json({ error: equosError })
    }

    const createdAgent = agentResult.data

    // Store agent ownership with vision
    await db.query(`
      INSERT INTO equos_agents (equos_id, organization_id, name, provider, model, voice, instructions, greeting_msg, search, emotions, memory, vision, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (equos_id) DO UPDATE SET user_id = EXCLUDED.user_id, vision = EXCLUDED.vision
    `, [
      createdAgent.id, createdAgent.organizationId, name, DEFAULT_PROVIDER,
      DEFAULT_MODEL, voice || DEFAULT_VOICE, instructions || null, greetingMsg || null,
      search || false, emotions || false, memory || false, vision || false, userId
    ])

    // Step 2: Create avatar
    const avatarIdentity = identity || `avatar-${Date.now().toString(36)}`
    const avatarData = {
      name,
      identity: avatarIdentity,
      refImage,
      agentId: createdAgent.id
    }
    
    const avatarResult = await equosRequest('POST', '/v1/avatars', avatarData)
    
    if (!avatarResult.ok) {
      // Rollback agent
      await equosRequest('DELETE', `/v1/agents/${createdAgent.id}`)
      await db.query('DELETE FROM equos_agents WHERE equos_id = $1', [createdAgent.id])
      const equosError = avatarResult.data?.message || avatarResult.data?.error || 'Failed to create avatar'
      return res.status(avatarResult.status).json({ error: equosError })
    }

    const createdAvatar = avatarResult.data

    // Store avatar ownership
    await db.query(`
      INSERT INTO equos_avatars (equos_id, organization_id, name, identity, agent_id, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (equos_id) DO UPDATE SET user_id = EXCLUDED.user_id
    `, [
      createdAvatar.id, createdAvatar.organizationId, name, avatarIdentity, createdAgent.id, userId
    ])

    // Enrich agent with vision (EQUOS may not return it)
    const enrichedAgent = {
      ...createdAgent,
      vision: !!vision
    }

    res.status(201).json({
      data: {
        avatar: sanitizeAvatar(createdAvatar),
        agent: sanitizeAgent(enrichedAgent)
      }
    })
  } catch (error) {
    console.error('External API create avatar error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// PATCH /v1/avatars/:id - Update avatar/agent
router.patch('/avatars/:id', validateApiKey, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const { 
      name, instructions, greetingMsg, 
      search, emotions, memory, vision, voice, model 
    } = req.body

    // Check ownership
    const ownershipResult = await db.query(
      'SELECT user_id, agent_id FROM equos_avatars WHERE equos_id = $1 AND user_id = $2',
      [id, userId]
    )

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    const { agent_id } = ownershipResult.rows[0]

    // Validate instructions length
    if (instructions && instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      return res.status(400).json({ 
        error: `Instructions exceed maximum length of ${MAX_INSTRUCTIONS_LENGTH} characters` 
      })
    }

    // Update Avatar (name only for now via this endpoint)
    if (name) {
      const avatarUpdate = await equosRequest('PUT', `/v1/avatars/${id}`, { name })
      if (avatarUpdate.ok) {
        await db.query('UPDATE equos_avatars SET name = $1 WHERE equos_id = $2', [name, id])
      }
    }

    // Update Agent configuration
    if (agent_id) {
      // Fetch current agent to merge
      const currentAgentRes = await equosRequest('GET', `/v1/agents/${agent_id}`)
      if (currentAgentRes.ok) {
        const current = currentAgentRes.data
        const agentUpdateData = {
          ...current,
          ...(name && { name }), // Sync name
          ...(instructions !== undefined && { instructions }),
          ...(greetingMsg !== undefined && { greetingMsg }),
          ...(voice && { voice }),
          ...(model && { model }),
          ...(search !== undefined && { search }),
          ...(emotions !== undefined && { emotions }),
          ...(memory !== undefined && { memory }),
          ...(vision !== undefined && { vision })
        }

        const agentUpdate = await equosRequest('PUT', `/v1/agents/${agent_id}`, agentUpdateData)
        
        if (agentUpdate.ok) {
           await db.query(`
            UPDATE equos_agents SET
              name = COALESCE($1, name),
              instructions = COALESCE($2, instructions),
              greeting_msg = COALESCE($3, greeting_msg),
              voice = COALESCE($4, voice),
              model = COALESCE($5, model),
              search = COALESCE($6, search),
              emotions = COALESCE($7, emotions),
              memory = COALESCE($8, memory),
              vision = COALESCE($9, vision),
              updated_at = NOW()
            WHERE equos_id = $10
          `, [
            name || null, 
            instructions !== undefined ? instructions : null, 
            greetingMsg !== undefined ? greetingMsg : null,
            voice || null,
            model || null,
            search !== undefined ? search : null,
            emotions !== undefined ? emotions : null,
            memory !== undefined ? memory : null,
            vision !== undefined ? vision : null,
            agent_id
          ])
        }
      }
    }

    // Fetch final state from EQUOS
    const avatarResult = await equosRequest('GET', `/v1/avatars/${id}`)
    
    // Get local vision data
    const localAgentResult = await db.query(
      'SELECT vision FROM equos_agents WHERE equos_id = $1',
      [agent_id]
    )
    const localVision = localAgentResult.rows[0]?.vision ?? false

    // Enrich response with local vision data
    const enrichedAvatar = {
      ...avatarResult.data,
      agent: avatarResult.data?.agent ? {
        ...avatarResult.data.agent,
        vision: localVision
      } : avatarResult.data?.agent
    }
    
    res.json({ data: sanitizeAvatar(enrichedAvatar) })

  } catch (error) {
    console.error('External API update avatar error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// DELETE /v1/avatars/:id - Delete avatar
router.delete('/avatars/:id', validateApiKey, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Check ownership
    const ownershipResult = await db.query(
      'SELECT user_id FROM equos_avatars WHERE equos_id = $1 AND user_id = $2',
      [id, userId]
    )

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    // Get details to find linked agent
    const avatarResult = await equosRequest('GET', `/v1/avatars/${id}`)
    let agentId = null
    if (avatarResult.ok) {
      agentId = avatarResult.data.agentId
    }

    const result = await equosRequest('DELETE', `/v1/avatars/${id}`)
    
    if (result.ok) {
      await db.query('DELETE FROM equos_avatars WHERE equos_id = $1', [id])

      if (agentId) {
        const agentDeleteResult = await equosRequest('DELETE', `/v1/agents/${agentId}`)
        if (agentDeleteResult.ok) {
          await db.query('DELETE FROM equos_agents WHERE equos_id = $1', [agentId])
        }
      }
    } else {
        return res.status(result.status).json({ error: 'Failed to delete avatar' })
    }

    res.json({ message: 'Avatar deleted successfully' })
  } catch (error) {
    console.error('External API delete avatar error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ========================================
// SESSIONS
// ========================================

// GET /v1/sessions - List sessions with external user filtering and status sync
router.get('/sessions', validateApiKey, async (req, res) => {
  try {
    const { take = 50, skip = 0, avatarId, externalUserId } = req.query
    const userId = req.user.id

    // Build query with filters
    let query = `
      SELECT equos_session_id, avatar_id, avatar_name, agent_name, session_name, 
             started_at, ended_at, duration_seconds, status,
             external_user_id, external_user_name
      FROM equos_session_logs
      WHERE user_id = $1
    `
    const params = [userId]
    
    // Filter by avatar if specified
    if (avatarId) {
      params.push(avatarId)
      query += ` AND avatar_id = $${params.length}`
    }
    
    // Filter by external user ID if specified (key feature for external systems)
    if (externalUserId) {
      params.push(externalUserId)
      query += ` AND external_user_id = $${params.length}`
    }
    
    query += ` ORDER BY started_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
    params.push(parseInt(take), parseInt(skip))

    const result = await db.query(query, params)
    
    // Sync status for "active" sessions from EQUOS API
    const sessions = result.rows
    for (const session of sessions) {
      if (session.status === 'active') {
        try {
          const liveStatus = await equosRequest('GET', `/v1/sessions/${session.equos_session_id}`)
          
          if (liveStatus.ok) {
            // Check if session has actually ended
            if (liveStatus.data?.status !== 'active' || liveStatus.data?.endedAt) {
              const endedAt = liveStatus.data?.endedAt || new Date().toISOString()
              
              // Update our local database
              await db.query(`
                UPDATE equos_session_logs 
                SET status = 'ended', 
                    ended_at = $1,
                    duration_seconds = EXTRACT(EPOCH FROM ($1::timestamptz - started_at))::integer
                WHERE equos_session_id = $2
              `, [endedAt, session.equos_session_id])
              
              // Update the response object
              session.status = 'ended'
              session.ended_at = endedAt
              session.duration_seconds = Math.round((new Date(endedAt) - new Date(session.started_at)) / 1000)
              
              console.log('[External API] Synced ended session:', session.equos_session_id)
            }
          } else if (liveStatus.status === 404) {
            // Session not found on EQUOS = definitely ended
            await db.query(`
              UPDATE equos_session_logs 
              SET status = 'ended'
              WHERE equos_session_id = $1 AND status = 'active'
            `, [session.equos_session_id])
            session.status = 'ended'
          }
        } catch (syncErr) {
          // Don't fail the request if sync fails, just log it
          console.error('[External API] Failed to sync session status:', session.equos_session_id, syncErr.message)
        }
      }
    }
    
    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) as total FROM equos_session_logs WHERE user_id = $1'
    const countParams = [userId]
    if (avatarId) {
      countParams.push(avatarId)
      countQuery += ` AND avatar_id = $${countParams.length}`
    }
    if (externalUserId) {
      countParams.push(externalUserId)
      countQuery += ` AND external_user_id = $${countParams.length}`
    }
    const countResult = await db.query(countQuery, countParams)

    res.json({
      data: sessions,
      meta: {
        total: parseInt(countResult.rows[0].total),
        take: parseInt(take),
        skip: parseInt(skip)
      }
    })
  } catch (error) {
    console.error('External API list sessions error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /v1/sessions/:id - Get session details with transcript
router.get('/sessions/:id', validateApiKey, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const { includeTranscript = 'false' } = req.query
    
    console.log('[External API] GET session:', id, 'userId:', userId, 'includeTranscript:', includeTranscript)

    // Check ownership and get session log (transcript is stored locally)
    const ownershipResult = await db.query(
      'SELECT * FROM equos_session_logs WHERE equos_session_id = $1 AND user_id = $2',
      [id, userId]
    )

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const sessionLog = ownershipResult.rows[0]
    let transcript = sessionLog.transcript || null
    
    console.log('[External API] Local DB data - status:', sessionLog.status, 'hasTranscript:', !!transcript)

    // Only fetch from EQUOS if session might still be active (to get live status)
    if (sessionLog.status === 'active') {
      try {
        const liveResult = await equosRequest('GET', `/v1/sessions/${id}`)
        if (liveResult.ok && liveResult.data?.status === 'active') {
          return res.json({ 
            data: {
              id: liveResult.data.id,
              name: liveResult.data.name || sessionLog.session_name,
              status: 'active',
              startedAt: liveResult.data.startedAt || sessionLog.started_at,
              avatarId: sessionLog.avatar_id,
              avatarName: sessionLog.avatar_name,
              agentId: sessionLog.agent_id,
              agentName: sessionLog.agent_name,
              externalUserId: sessionLog.external_user_id
            }
          })
        }
      } catch (e) {
        // Ignore error, fallback to DB
      }
    }

    // For ended sessions, fetch transcript from EQUOS ONLY if not already in our local DB
    if (includeTranscript === 'true' && sessionLog.status === 'ended' && !transcript) {
      console.log('[External API] Transcript not in local DB for session:', id, '- fetching from EQUOS...')
      try {
        // First, try to get transcript from the session response we already fetched
        const sessionResult = await equosRequest('GET', `/v1/sessions/${id}`)
        
        if (sessionResult.ok && sessionResult.data?.transcript) {
          console.log('[External API] Found transcript in session response')
          transcript = sessionResult.data.transcript
        } else {
          // Try the explicit transcript endpoint
          console.log('[External API] Trying /transcript endpoint...')
          const transcriptResult = await equosRequest('GET', `/v1/sessions/${id}/transcript`)
          
          if (transcriptResult.ok && transcriptResult.data) {
            // Handle different response formats
            if (transcriptResult.data.transcription) {
              transcript = transcriptResult.data
            } else if (Array.isArray(transcriptResult.data)) {
              transcript = { transcription: transcriptResult.data }
            } else {
              transcript = transcriptResult.data
            }
          }
        }
        
        // Save transcript to local DB for future requests
        if (transcript && (transcript.transcription || Array.isArray(transcript))) {
          await db.query(
            'UPDATE equos_session_logs SET transcript = $1 WHERE equos_session_id = $2',
            [JSON.stringify(transcript), id]
          )
          console.log('[External API] Saved transcript to DB for session:', id)
        } else {
          console.log('[External API] No transcript content found for:', id)
        }
      } catch (e) {
        console.error('[External API] Failed to fetch transcript:', e.message)
      }
    }

    // Build consistent response
    const responseTranscript = includeTranscript === 'true' ? transcript : (transcript ? true : null)
    console.log('[External API] Returning session:', id, 'hasTranscript:', !!transcript, 'includeTranscript:', includeTranscript, 'returningTranscript:', !!responseTranscript)
    
    res.json({ 
      data: {
        id: sessionLog.equos_session_id,
        name: sessionLog.session_name,
        status: sessionLog.status,
        startedAt: sessionLog.started_at,
        endedAt: sessionLog.ended_at,
        durationSeconds: sessionLog.duration_seconds,
        avatarId: sessionLog.avatar_id,
        avatarName: sessionLog.avatar_name,
        agentId: sessionLog.agent_id,
        agentName: sessionLog.agent_name,
        externalUserId: sessionLog.external_user_id,
        transcript: responseTranscript
      }
    })
  } catch (error) {
    console.error('External API get session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /v1/sessions - Start session
router.post('/sessions', validateApiKey, async (req, res) => {
  try {
    const userId = req.user.id
    const user = req.user
    const { 
      avatarId,
      name = 'API Session',
      consumerIdentity,
      maxDuration,
      additionalCtx,
      templateVars
    } = req.body

    if (!avatarId) {
      return res.status(400).json({ error: 'avatarId is required' })
    }

    // Verify ownership/access and get agent_id (access control - users only see their assigned agents)
    const ownershipResult = await db.query(
      'SELECT user_id, agent_id FROM equos_avatars WHERE equos_id = $1 AND user_id = $2',
      [avatarId, userId]
    )

    if (ownershipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Avatar not found' })
    }

    const { agent_id: linkedAgentId } = ownershipResult.rows[0]

    // consumerIdentity is required for hosted sessions
    const identity = consumerIdentity || {
      identity: `api-user-${userId}-${Date.now()}`,
      name: user.name || user.email || 'API User'
    }

    const sessionData = {
      name,
      avatar: { id: avatarId },
      consumerIdentity: identity,
      ...(linkedAgentId && { agent: { id: linkedAgentId } }),
      ...(maxDuration && { maxDuration: parseInt(maxDuration) }),
      ...(additionalCtx && { additionalCtx }),
      ...(templateVars && { templateVars })
    }
    
    // Detailed debug logging to compare with internal API
    console.log('='.repeat(60))
    console.log('[External API] SESSION START DEBUG')
    console.log('='.repeat(60))
    console.log('[External API] User:', userId, user.email)
    console.log('[External API] Avatar ID:', avatarId)
    console.log('[External API] Agent ID from local DB:', linkedAgentId)
    console.log('[External API] Session data:', JSON.stringify(sessionData, null, 2))
    console.log('='.repeat(60))
    
    const result = await equosRequest('POST', '/v1/sessions', sessionData)
    
    // Log the EQUOS response for debugging
    console.log('[External API] EQUOS response status:', result.status, result.ok ? 'OK' : 'FAILED')
    if (result.ok && result.data?.session) {
      console.log('[External API] Session ID:', result.data.session.id)
      console.log('[External API] Session agentId:', result.data.session.agentId)
      console.log('[External API] Session agent:', JSON.stringify(result.data.session.agent, null, 2))
      console.log('[External API] LiveKit URL:', result.data.session.host?.serverUrl)
    }
    
    if (!result.ok) {
      console.error('[External API] Session creation failed:', JSON.stringify(result.data, null, 2))
      return res.status(result.status).json({ 
        error: 'Failed to start session',
        details: result.data
      })
    }

    const session = result.data.session

    // Log session with external user tracking
    if (session) {
      // Extract external user info from consumerIdentity
      const externalUserId = identity.identity || null
      const externalUserName = identity.name || null
      
      await db.query(`
        INSERT INTO equos_session_logs (
          equos_session_id, user_id, avatar_id, avatar_name, 
          agent_id, agent_name, session_name, started_at, status,
          external_user_id, external_user_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)
        ON CONFLICT (equos_session_id) DO NOTHING
      `, [
        session.id,
        userId,
        session.avatarId || avatarId,
        session.avatar?.name || null,
        session.agentId || null,
        session.agent?.name || null,
        session.name || name,
        session.startedAt || new Date().toISOString(),
        externalUserId,
        externalUserName
      ])
      
      console.log('[External API] Session logged with external_user_id:', externalUserId)
    }
    
    res.status(201).json({ data: result.data })
  } catch (error) {
    console.error('External API start session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /v1/sessions/:id/stop - Stop session
router.post('/sessions/:id/stop', validateApiKey, async (req, res) => {
  try {
    const { id } = req.params
    // Verify session ownership via logs
    const ownershipResult = await db.query(
        'SELECT user_id FROM equos_session_logs WHERE equos_session_id = $1 AND user_id = $2',
        [id, req.user.id]
    )
    
    if (ownershipResult.rows.length === 0) {
        // Fallback: check if we can just stop it (maybe session log missing but user owns it?)
        // For security, strict check is better.
        return res.status(404).json({ error: 'Session not found or access denied' })
    }

    const result = await equosRequest('PATCH', `/v1/sessions/${id}/stop`)
    
    if (result.ok) {
      const endedAt = result.data?.endedAt || new Date().toISOString()
      await db.query(`
        UPDATE equos_session_logs 
        SET ended_at = $1, status = 'ended',
            duration_seconds = EXTRACT(EPOCH FROM ($1::timestamptz - started_at))::integer
        WHERE equos_session_id = $2
      `, [endedAt, id])
    } else {
        return res.status(result.status).json({ error: 'Failed to stop session' })
    }
    
    res.json({ data: result.data })
  } catch (error) {
    console.error('External API stop session error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router

