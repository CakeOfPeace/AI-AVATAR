const express = require('express')
const db = require('../db.cjs')
const { verifyToken, requireAdmin } = require('../middleware/auth.cjs')
const { equosRequest } = require('../lib/equosClient.cjs')

const router = express.Router()

// Character limits
const MAX_INSTRUCTIONS_LENGTH = 5500

// Default Gemini settings - always use these
const DEFAULT_PROVIDER = 'gemini'
const DEFAULT_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025'
const DEFAULT_VOICE = 'Puck'


// ========================================
// HEALTH CHECK (no auth required)
// ========================================

// GET /api/equos/health - Health check
router.get('/health', async (req, res) => {
  try {
    const result = await equosRequest('GET', '/v1/health')
    res.status(result.status).json(result.data)
  } catch (error) {
    console.error('EQUOS health check error:', error)
    res.status(500).json({ error: error.message })
  }
})


// ========================================
// ORGANIZATION LIMITS (admin only)
// ========================================

// GET /api/equos/limits - Get organization limits
router.get('/limits', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await equosRequest('GET', '/v1/limits')
    res.status(result.status).json(result.data)
  } catch (error) {
    console.error('EQUOS limits error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ========================================
// AGENTS
// ========================================

// GET /api/equos/agents - List agents (filtered by user, admins see all)
router.get('/agents', verifyToken, async (req, res) => {
  try {
    const { take = 50, skip = 0 } = req.query
    const userId = req.user.id
    const isAdmin = req.user.role === 'admin'

    // Fetch all agents from EQUOS API
    const result = await equosRequest('GET', `/v1/agents?take=${take}&skip=${skip}`)
    
    if (!result.ok) {
      return res.status(result.status).json(result.data)
    }

    const allEquosAgents = result.data.agents || []

    // Get local agent records with ownership info
    const localAgentsResult = await db.query(`
      SELECT ea.equos_id, ea.user_id, u.email as owner_email, u.name as owner_name
      FROM equos_agents ea
      LEFT JOIN users u ON ea.user_id = u.id
    `)
    
    const ownershipMap = {}
    localAgentsResult.rows.forEach(row => {
      ownershipMap[row.equos_id] = {
        user_id: row.user_id,
        owner_email: row.owner_email,
        owner_name: row.owner_name
      }
    })

    // Filter agents based on user role
    let filteredAgents
    if (isAdmin) {
      // Admin sees all agents with owner info
      filteredAgents = allEquosAgents.map(agent => ({
        ...agent,
        owner: ownershipMap[agent.id] || { user_id: null, owner_email: 'Unknown', owner_name: 'Pre-migration' }
      }))
    } else {
      // Regular users only see their own agents
      filteredAgents = allEquosAgents.filter(agent => {
        const ownership = ownershipMap[agent.id]
        return ownership && ownership.user_id === userId
      })
    }

    res.json({
      agents: filteredAgents,
      total: filteredAgents.length,
      isAdmin
    })
  } catch (error) {
    console.error('EQUOS list agents error:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/equos/agents - Create agent (stores ownership)
router.post('/agents', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { name, provider, model, voice, instructions, greetingMsg, search, emotions, memory, client } = req.body
    
    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' })
    }

    // Validate instructions length
    if (instructions && instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      return res.status(400).json({ 
        error: `Instructions exceed maximum length of ${MAX_INSTRUCTIONS_LENGTH} characters (current: ${instructions.length})` 
      })
    }
    
    const agentData = {
      provider,
      ...(name && { name }),
      ...(model && { model }),
      ...(voice && { voice }),
      ...(instructions && { instructions }),
      ...(greetingMsg && { greetingMsg }),
      ...(typeof search === 'boolean' && { search }),
      ...(typeof emotions === 'boolean' && { emotions }),
      ...(typeof memory === 'boolean' && { memory }),
      ...(client && { client })
    }
    
    // Create agent in EQUOS API
    const result = await equosRequest('POST', '/v1/agents', agentData)
    
    if (!result.ok) {
      return res.status(result.status).json(result.data)
    }

    const createdAgent = result.data

    // Store ownership in local database
    await db.query(`
      INSERT INTO equos_agents (
        equos_id, organization_id, name, provider, model, voice, 
        instructions, greeting_msg, search, emotions, memory, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (equos_id) DO UPDATE SET
        name = EXCLUDED.name,
        provider = EXCLUDED.provider,
        model = EXCLUDED.model,
        voice = EXCLUDED.voice,
        instructions = EXCLUDED.instructions,
        greeting_msg = EXCLUDED.greeting_msg,
        search = EXCLUDED.search,
        emotions = EXCLUDED.emotions,
        memory = EXCLUDED.memory,
        user_id = EXCLUDED.user_id,
        updated_at = NOW()
    `, [
      createdAgent.id,
      createdAgent.organizationId,
      name || null,
      provider,
      model || null,
      voice || null,
      instructions || null,
      greetingMsg || null,
      search || false,
      emotions || false,
      memory || false,
      userId
    ])

    res.status(201).json(createdAgent)
  } catch (error) {
    console.error('EQUOS create agent error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/equos/agents/:id - Get agent by ID (with ownership check)
router.get('/agents/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const isAdmin = req.user.role === 'admin'

    // Check ownership
    const ownershipResult = await db.query(
      'SELECT user_id FROM equos_agents WHERE equos_id = $1',
      [id]
    )

    if (!isAdmin && ownershipResult.rows.length > 0 && ownershipResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to view this agent' })
    }

    const result = await equosRequest('GET', `/v1/agents/${id}`)
    res.status(result.status).json(result.data)
  } catch (error) {
    console.error('EQUOS get agent error:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/equos/agents/:id - Update agent (with ownership check)
router.put('/agents/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const isAdmin = req.user.role === 'admin'
    const { name, provider, model, voice, instructions, greetingMsg, search, emotions, memory, vision, client } = req.body
    
    // Validate instructions length
    if (instructions && instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      return res.status(400).json({ 
        error: `Instructions exceed maximum length of ${MAX_INSTRUCTIONS_LENGTH} characters (current: ${instructions.length})` 
      })
    }
    
    // Check ownership
    const ownershipResult = await db.query(
      'SELECT user_id FROM equos_agents WHERE equos_id = $1',
      [id]
    )

    if (!isAdmin && ownershipResult.rows.length > 0 && ownershipResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this agent' })
    }

    // Fetch current agent data from EQUOS to merge with updates
    const currentResult = await equosRequest('GET', `/v1/agents/${id}`)
    if (!currentResult.ok) {
      return res.status(currentResult.status).json({ error: 'Agent not found', details: currentResult.data })
    }

    const currentAgent = currentResult.data
    
    // Merge updates with existing data - provider is required
    const finalProvider = provider || currentAgent.provider
    const finalName = name !== undefined ? name : currentAgent.name
    const finalModel = model !== undefined ? model : currentAgent.model
    const finalVoice = voice !== undefined ? voice : currentAgent.voice
    const finalInstructions = instructions !== undefined ? instructions : currentAgent.instructions
    const finalGreetingMsg = greetingMsg !== undefined ? greetingMsg : currentAgent.greetingMsg
    const finalSearch = search !== undefined ? search : currentAgent.search
    const finalEmotions = emotions !== undefined ? emotions : currentAgent.emotions
    const finalMemory = memory !== undefined ? memory : currentAgent.memory
    
    // Vision is stored locally, not in EQUOS - get current value from local DB if not provided
    let finalVision = vision
    if (vision === undefined) {
      const localAgentResult = await db.query('SELECT vision FROM equos_agents WHERE equos_id = $1', [id])
      finalVision = localAgentResult.rows.length > 0 ? localAgentResult.rows[0].vision : false
    }
    
    const agentData = {
      id,
      organizationId: currentAgent.organizationId,
      provider: finalProvider,
      name: finalName,
      model: finalModel,
      voice: finalVoice,
      instructions: finalInstructions,
      greetingMsg: finalGreetingMsg,
      search: finalSearch,
      emotions: finalEmotions,
      memory: finalMemory,
      ...(client && { client })
    }
    
    const result = await equosRequest('PUT', `/v1/agents/${id}`, agentData)

    if (result.ok) {
      // Update local record (including vision which is only stored locally)
      await db.query(`
        UPDATE equos_agents SET
          name = $1, provider = $2, model = $3, voice = $4,
          instructions = $5, greeting_msg = $6, search = $7,
          emotions = $8, memory = $9, vision = $10, updated_at = NOW()
        WHERE equos_id = $11
      `, [finalName, finalProvider, finalModel, finalVoice, finalInstructions, finalGreetingMsg, finalSearch, finalEmotions, finalMemory, finalVision, id])
    }

    // Return the agent data with vision included
    const responseData = result.data ? { ...result.data, vision: finalVision } : result.data
    res.status(result.status).json(responseData)
  } catch (error) {
    console.error('EQUOS update agent error:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/equos/agents/:id - Delete agent (with ownership check)
router.delete('/agents/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const isAdmin = req.user.role === 'admin'

    // Check ownership
    const ownershipResult = await db.query(
      'SELECT user_id FROM equos_agents WHERE equos_id = $1',
      [id]
    )

    if (!isAdmin && ownershipResult.rows.length > 0 && ownershipResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this agent' })
    }

    const result = await equosRequest('DELETE', `/v1/agents/${id}`)
    
    if (result.ok) {
      // Remove from local database
      await db.query('DELETE FROM equos_agents WHERE equos_id = $1', [id])
    }

    res.status(result.status).json(result.data)
  } catch (error) {
    console.error('EQUOS delete agent error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ========================================
// AVATARS (with ownership tracking)
// ========================================

// GET /api/equos/avatars - List avatars (filtered by user, admins see all)
router.get('/avatars', verifyToken, async (req, res) => {
  try {
    const { take = 50, skip = 0, client } = req.query
    const userId = req.user.id
    const isAdmin = req.user.role === 'admin'

    let endpoint = `/v1/avatars?take=${take}&skip=${skip}`
    if (client) {
      endpoint += `&client=${encodeURIComponent(client)}`
    }
    
    // Fetch all avatars from EQUOS API
    const result = await equosRequest('GET', endpoint)
    
    if (!result.ok) {
      return res.status(result.status).json(result.data)
    }

    const allEquosAvatars = result.data.avatars || []

    // Get local avatar records with ownership info, maxDuration, and linked agent vision status
    const localAvatarsResult = await db.query(`
      SELECT ea.equos_id, ea.user_id, ea.agent_id, ea.max_duration, u.email as owner_email, u.name as owner_name,
             ag.vision as agent_vision
      FROM equos_avatars ea
      LEFT JOIN users u ON ea.user_id = u.id
      LEFT JOIN equos_agents ag ON ea.agent_id = ag.equos_id
    `)
    
    const ownershipMap = {}
    localAvatarsResult.rows.forEach(row => {
      ownershipMap[row.equos_id] = {
        user_id: row.user_id,
        owner_email: row.owner_email,
        owner_name: row.owner_name,
        agent_vision: row.agent_vision || false,
        max_duration: row.max_duration || 120
      }
    })

    // Filter avatars based on user role and enrich with local data (including vision and maxDuration)
    let filteredAvatars
    if (isAdmin) {
      // Admin sees all avatars with owner info
      filteredAvatars = allEquosAvatars.map(avatar => {
        const localData = ownershipMap[avatar.id] || { user_id: null, owner_email: 'Unknown', owner_name: 'Pre-migration', agent_vision: false, max_duration: 120 }
        return {
          ...avatar,
          owner: localData,
          maxDuration: localData.max_duration,
          // Inject vision into agent if present
          agent: avatar.agent ? { ...avatar.agent, vision: localData.agent_vision } : avatar.agent
        }
      })
    } else {
      // Regular users only see their own avatars
      filteredAvatars = allEquosAvatars.filter(avatar => {
        const ownership = ownershipMap[avatar.id]
        return ownership && ownership.user_id === userId
      }).map(avatar => {
        const localData = ownershipMap[avatar.id] || { agent_vision: false, max_duration: 120 }
        return {
          ...avatar,
          maxDuration: localData.max_duration,
          // Inject vision into agent if present
          agent: avatar.agent ? { ...avatar.agent, vision: localData.agent_vision } : avatar.agent
        }
      })
    }

    res.json({
      avatars: filteredAvatars,
      total: filteredAvatars.length,
      isAdmin
    })
  } catch (error) {
    console.error('EQUOS list avatars error:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/equos/avatars - Create avatar (stores ownership)
router.post('/avatars', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { identity, name, refImage, agentId, client } = req.body
    
    if (!identity || !name || !refImage) {
      return res.status(400).json({ error: 'identity, name, and refImage are required' })
    }
    
    const avatarData = {
      identity,
      name,
      refImage,
      agentId: agentId || null,
      ...(client && { client })
    }
    
    // Create avatar in EQUOS API
    const result = await equosRequest('POST', '/v1/avatars', avatarData)
    
    if (!result.ok) {
      return res.status(result.status).json(result.data)
    }

    const createdAvatar = result.data

    // Store ownership in local database
    await db.query(`
      INSERT INTO equos_avatars (
        equos_id, organization_id, name, identity, agent_id, user_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (equos_id) DO UPDATE SET
        name = EXCLUDED.name,
        identity = EXCLUDED.identity,
        agent_id = EXCLUDED.agent_id,
        user_id = EXCLUDED.user_id,
        updated_at = NOW()
    `, [
      createdAvatar.id,
      createdAvatar.organizationId,
      name,
      identity,
      agentId || null,
      userId
    ])

    res.status(201).json(createdAvatar)
  } catch (error) {
    console.error('EQUOS create avatar error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/equos/avatars/:id - Get avatar by ID (with ownership check)
router.get('/avatars/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const isAdmin = req.user.role === 'admin'

    // Check ownership
    const ownershipResult = await db.query(
      'SELECT user_id FROM equos_avatars WHERE equos_id = $1',
      [id]
    )

    if (!isAdmin && ownershipResult.rows.length > 0 && ownershipResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to view this avatar' })
    }

    const result = await equosRequest('GET', `/v1/avatars/${id}`)
    res.status(result.status).json(result.data)
  } catch (error) {
    console.error('EQUOS get avatar error:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/equos/avatars/:id - Update avatar (with ownership check)
router.put('/avatars/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const isAdmin = req.user.role === 'admin'
    const { name, agentId, maxDuration, client } = req.body
    
    // Check ownership
    const ownershipResult = await db.query(
      'SELECT user_id FROM equos_avatars WHERE equos_id = $1',
      [id]
    )

    if (!isAdmin && ownershipResult.rows.length > 0 && ownershipResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to edit this avatar' })
    }

    // Fetch current avatar data from EQUOS to get required fields
    const currentResult = await equosRequest('GET', `/v1/avatars/${id}`)
    if (!currentResult.ok) {
      return res.status(currentResult.status).json({ error: 'Avatar not found', details: currentResult.data })
    }

    const currentAvatar = currentResult.data
    
    // Merge updates with existing data
    const avatarData = {
      id,
      organizationId: currentAvatar.organizationId,
      identity: currentAvatar.identity, // Identity cannot be changed
      name: name || currentAvatar.name,
      refImage: currentAvatar.refImage, // refImage cannot be changed after creation
      agentId: agentId !== undefined ? agentId : currentAvatar.agentId,
      ...(client && { client })
    }
    
    const result = await equosRequest('PUT', `/v1/avatars/${id}`, avatarData)

    if (result.ok) {
      // Update local record (including maxDuration which is stored locally)
      await db.query(`
        UPDATE equos_avatars SET
          name = $1, agent_id = $2, max_duration = COALESCE($3, max_duration), updated_at = NOW()
        WHERE equos_id = $4
      `, [avatarData.name, avatarData.agentId, maxDuration || null, id])
    }

    // Return with local maxDuration
    const localData = await db.query('SELECT max_duration FROM equos_avatars WHERE equos_id = $1', [id])
    const responseData = {
      ...result.data,
      maxDuration: localData.rows[0]?.max_duration || 120
    }
    
    res.status(result.status).json(responseData)
  } catch (error) {
    console.error('EQUOS update avatar error:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/equos/avatars/:id - Delete avatar (with ownership check)
router.delete('/avatars/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const isAdmin = req.user.role === 'admin'

    // Check ownership
    const ownershipResult = await db.query(
      'SELECT user_id FROM equos_avatars WHERE equos_id = $1',
      [id]
    )

    if (!isAdmin && ownershipResult.rows.length > 0 && ownershipResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this avatar' })
    }

    // Get avatar details to find linked agent
    const avatarResult = await equosRequest('GET', `/v1/avatars/${id}`)
    let agentId = null
    if (avatarResult.ok) {
      agentId = avatarResult.data.agentId
    }

    const result = await equosRequest('DELETE', `/v1/avatars/${id}`)
    
    if (result.ok) {
      // Remove from local database
      await db.query('DELETE FROM equos_avatars WHERE equos_id = $1', [id])

      // Delete linked agent if it exists
      if (agentId) {
        console.log(`[EQUOS] Deleting linked agent ${agentId} for avatar ${id}`)
        const agentDeleteResult = await equosRequest('DELETE', `/v1/agents/${agentId}`)
        
        if (agentDeleteResult.ok) {
          await db.query('DELETE FROM equos_agents WHERE equos_id = $1', [agentId])
          console.log(`[EQUOS] Linked agent ${agentId} deleted successfully`)
        } else {
          console.error(`[EQUOS] Failed to delete linked agent ${agentId}:`, agentDeleteResult.data)
        }
      }
    }

    res.status(result.status).json(result.data)
  } catch (error) {
    console.error('EQUOS delete avatar error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ========================================
// SYNC OWNERSHIP (admin only - sync existing EQUOS items)
// ========================================

// POST /api/equos/sync - Sync existing EQUOS items to local ownership tables (admin assigns to self)
router.post('/sync', verifyToken, requireAdmin, async (req, res) => {
  try {
    const adminId = req.user.id
    
    // Fetch all agents from EQUOS
    const agentsResult = await equosRequest('GET', '/v1/agents?take=100&skip=0')
    const agents = agentsResult.ok ? (agentsResult.data.agents || []) : []
    
    // Fetch all avatars from EQUOS
    const avatarsResult = await equosRequest('GET', '/v1/avatars?take=100&skip=0')
    const avatars = avatarsResult.ok ? (avatarsResult.data.avatars || []) : []
    
    let syncedAgents = 0
    let syncedAvatars = 0
    
    // Sync agents - add missing ones to local DB with admin as owner
    for (const agent of agents) {
      const existing = await db.query('SELECT id FROM equos_agents WHERE equos_id = $1', [agent.id])
      if (existing.rows.length === 0) {
        await db.query(`
          INSERT INTO equos_agents (equos_id, organization_id, name, provider, user_id)
          VALUES ($1, $2, $3, $4, $5)
        `, [agent.id, agent.organizationId, agent.name, agent.provider || 'openai', adminId])
        syncedAgents++
      }
    }
    
    // Sync avatars - add missing ones to local DB with admin as owner
    for (const avatar of avatars) {
      const existing = await db.query('SELECT id FROM equos_avatars WHERE equos_id = $1', [avatar.id])
      if (existing.rows.length === 0) {
        await db.query(`
          INSERT INTO equos_avatars (equos_id, organization_id, name, identity, agent_id, user_id)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [avatar.id, avatar.organizationId, avatar.name, avatar.identity, avatar.agentId, adminId])
        syncedAvatars++
      }
    }
    
    res.json({
      success: true,
      synced: {
        agents: syncedAgents,
        avatars: syncedAvatars
      },
      total: {
        agents: agents.length,
        avatars: avatars.length
      }
    })
  } catch (error) {
    console.error('EQUOS sync error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ========================================
// COMBINED AVATAR + AGENT CREATION (for unified UI)
// ========================================

// Helper for identity generation
const generateIdentity = (name) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return `avatar-${slug}-${Date.now().toString(36)}`
}

// POST /api/equos/avatars/combined - Create agent + avatar together
// This orchestrates the existing EQUOS API endpoints - does NOT replace them
router.post('/avatars/combined', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { 
      name, refImage, identity,
      voice, instructions, greetingMsg, 
      search, emotions, memory, vision
    } = req.body

    // Validate required fields - provider/model are now always Gemini defaults
    if (!name || !refImage) {
      return res.status(400).json({ error: 'name and refImage are required' })
    }

    // Validate instructions length
    if (instructions && instructions.length > MAX_INSTRUCTIONS_LENGTH) {
      return res.status(400).json({ 
        error: `Instructions exceed maximum length of ${MAX_INSTRUCTIONS_LENGTH} characters (current: ${instructions.length})` 
      })
    }

    // Step 1: Create agent via EQUOS API - always use Gemini defaults
    const agentData = {
      name,
      provider: DEFAULT_PROVIDER,
      model: DEFAULT_MODEL,
      voice: voice || DEFAULT_VOICE,
      ...(instructions && { instructions }),
      ...(greetingMsg && { greetingMsg }),
      ...(typeof search === 'boolean' && { search }),
      ...(typeof emotions === 'boolean' && { emotions }),
      ...(typeof memory === 'boolean' && { memory }),
      ...(typeof vision === 'boolean' && { vision })
    }
    
    console.log('[EQUOS Combined] Creating agent:', agentData.name, 'vision:', !!vision)
    const agentResult = await equosRequest('POST', '/v1/agents', agentData)
    
    if (!agentResult.ok) {
      console.error('[EQUOS Combined] Agent creation failed:', agentResult.data)
      // Extract the user-friendly error message from EQUOS response
      const equosError = agentResult.data?.message || agentResult.data?.error || 'Failed to create agent'
      return res.status(agentResult.status).json({ error: equosError, details: agentResult.data })
    }

    const createdAgent = agentResult.data
    console.log('[EQUOS Combined] Agent created:', createdAgent.id)

    // Store agent ownership in local database (including vision)
    await db.query(`
      INSERT INTO equos_agents (equos_id, organization_id, name, provider, model, voice, instructions, greeting_msg, search, emotions, memory, vision, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (equos_id) DO UPDATE SET user_id = EXCLUDED.user_id, vision = EXCLUDED.vision, updated_at = NOW()
    `, [
      createdAgent.id, createdAgent.organizationId, name, DEFAULT_PROVIDER,
      DEFAULT_MODEL, voice || DEFAULT_VOICE, instructions || null, greetingMsg || null,
      search || false, emotions || false, memory || false, vision || false, userId
    ])

    // Step 2: Create avatar linked to the agent
    const avatarIdentity = identity || generateIdentity(name)
    const avatarData = {
      name,
      identity: avatarIdentity,
      refImage,
      agentId: createdAgent.id
    }
    
    console.log('[EQUOS Combined] Creating avatar:', avatarData.name, 'linked to agent:', createdAgent.id)
    const avatarResult = await equosRequest('POST', '/v1/avatars', avatarData)
    
    if (!avatarResult.ok) {
      console.error('[EQUOS Combined] Avatar creation failed:', avatarResult.data)
      // Rollback: delete the agent we just created
      console.log('[EQUOS Combined] Rolling back agent:', createdAgent.id)
      await equosRequest('DELETE', `/v1/agents/${createdAgent.id}`)
      await db.query('DELETE FROM equos_agents WHERE equos_id = $1', [createdAgent.id])
      
      // Extract the user-friendly error message from EQUOS response
      const equosError = avatarResult.data?.message || avatarResult.data?.error || 'Unknown error'
      return res.status(avatarResult.status).json({ 
        error: equosError,
        details: avatarResult.data 
      })
    }

    const createdAvatar = avatarResult.data
    console.log('[EQUOS Combined] Avatar created:', createdAvatar.id)

    // Store avatar ownership in local database
    await db.query(`
      INSERT INTO equos_avatars (equos_id, organization_id, name, identity, agent_id, user_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (equos_id) DO UPDATE SET user_id = EXCLUDED.user_id, updated_at = NOW()
    `, [
      createdAvatar.id, createdAvatar.organizationId, name, avatarIdentity, createdAgent.id, userId
    ])

    console.log('[EQUOS Combined] Success - Avatar:', createdAvatar.id, 'Agent:', createdAgent.id)
    res.status(201).json({
      avatar: createdAvatar,
      agent: createdAgent
    })
  } catch (error) {
    console.error('[EQUOS Combined] Error:', error)
    res.status(500).json({ error: error.message })
  }
})

// ========================================
// SESSIONS
// ========================================

// GET /api/equos/sessions - List sessions (filtered by user, admins see all)
router.get('/sessions', verifyToken, async (req, res) => {
  try {
    const { take = 20, skip = 0, client, filterUser, filterAvatar } = req.query
    const userId = req.user.id
    const isAdmin = req.user.role === 'admin'
    
    let endpoint = `/v1/sessions?take=100&skip=${skip}`
    if (client) {
      endpoint += `&client=${encodeURIComponent(client)}`
    }
    
    const result = await equosRequest('GET', endpoint)
    
    if (!result.ok) {
      return res.status(result.status).json(result.data)
    }
    
    const allEquosSessions = result.data.sessions || []
    
    // Get local session logs with full details including user info
    const localSessionsResult = await db.query(`
      SELECT 
        esl.equos_session_id, 
        esl.user_id, 
        esl.status as local_status,
        esl.avatar_id,
        esl.avatar_name,
        esl.agent_id,
        esl.agent_name,
        esl.session_name,
        esl.started_at,
        esl.ended_at,
        esl.duration_seconds,
        esl.external_user_id,
        esl.transcript,
        u.email as user_email,
        u.name as user_name,
        ea.vision as agent_vision,
        ea.provider as agent_provider,
        ea.model as agent_model
      FROM equos_session_logs esl
      LEFT JOIN users u ON esl.user_id = u.id
      LEFT JOIN equos_agents ea ON esl.agent_id = ea.equos_id
    `)
    
    const localSessionMap = {}
    localSessionsResult.rows.forEach(row => {
      localSessionMap[row.equos_session_id] = {
        userId: row.user_id,
        localStatus: row.local_status,
        avatarId: row.avatar_id,
        avatarName: row.avatar_name,
        agentId: row.agent_id,
        agentName: row.agent_name,
        sessionName: row.session_name,
        startedAt: row.started_at,
        endedAt: row.ended_at,
        durationSeconds: row.duration_seconds,
        externalUserId: row.external_user_id,
        transcript: row.transcript,
        user: {
          id: row.user_id,
          email: row.user_email,
          name: row.user_name
        },
        agent: {
          vision: row.agent_vision,
          provider: row.agent_provider,
          model: row.agent_model
        }
      }
    })
    
    // Sync status: update local DB for sessions that ended on EQUOS side
    for (const session of allEquosSessions) {
      const local = localSessionMap[session.id]
      if (local && local.localStatus === 'active' && (session.status !== 'active' || session.endedAt)) {
        // Session ended on EQUOS side but our local DB still says active
        const endedAt = session.endedAt || new Date().toISOString()
        try {
          await db.query(`
            UPDATE equos_session_logs 
            SET status = 'ended', 
                ended_at = $1,
                duration_seconds = EXTRACT(EPOCH FROM ($1::timestamptz - started_at))::integer
            WHERE equos_session_id = $2 AND status = 'active'
          `, [endedAt, session.id])
          console.log('[Session Sync] Updated ended session:', session.id)
          // Update local map
          local.localStatus = 'ended'
          local.endedAt = endedAt
        } catch (syncErr) {
          console.error('[Session Sync] Failed to update:', session.id, syncErr.message)
        }
      }
    }
    
    // Enrich EQUOS sessions with local data
    const enrichedSessions = allEquosSessions.map(session => {
      const local = localSessionMap[session.id] || {}
      return {
        id: session.id,
        equosSessionId: session.id,
        name: session.name || local.sessionName,
        status: session.status || local.localStatus || 'unknown',
        startedAt: session.startedAt || local.startedAt,
        endedAt: session.endedAt || local.endedAt,
        durationSeconds: local.durationSeconds,
        externalUserId: local.externalUserId,
        transcript: local.transcript ? true : null, // Just indicate if transcript exists
        visionEnabled: local.agent?.vision || false,
        user: local.user || null,
        avatar: {
          id: session.avatarId || local.avatarId,
          name: session.avatar?.name || local.avatarName
        },
        agent: {
          id: session.agentId || local.agentId,
          name: session.agent?.name || local.agentName,
          vision: local.agent?.vision || false,
          provider: local.agent?.provider || 'gemini',
          model: local.agent?.model
        }
      }
    })
    
    // Filter sessions based on user role
    let filteredSessions
    if (isAdmin) {
      // Admin sees all sessions
      filteredSessions = enrichedSessions
    } else {
      // Regular users only see their own sessions
      filteredSessions = enrichedSessions.filter(session => {
        return session.user?.id === userId
      })
    }
    
    // Apply user filter (admin only)
    if (isAdmin && filterUser && filterUser !== 'all') {
      filteredSessions = filteredSessions.filter(s => 
        s.user?.id === parseInt(filterUser)
      )
    }
    
    // Apply avatar filter
    if (filterAvatar && filterAvatar !== 'all') {
      filteredSessions = filteredSessions.filter(s => 
        s.avatar?.id === filterAvatar
      )
    }
    
    // Apply take limit after filtering
    const paginatedSessions = filteredSessions.slice(0, parseInt(take))
    
    // Build filter options for admin UI
    const filterOptions = isAdmin ? {
      users: [...new Map(
        enrichedSessions
          .filter(s => s.user?.id)
          .map(s => [s.user.id, { id: s.user.id, name: s.user.name, email: s.user.email }])
      ).values()],
      avatars: [...new Map(
        enrichedSessions
          .filter(s => s.avatar?.id)
          .map(s => [s.avatar.id, { id: s.avatar.id, name: s.avatar.name }])
      ).values()]
    } : null
    
    res.json({
      sessions: paginatedSessions,
      total: filteredSessions.length,
      skip: parseInt(skip),
      take: parseInt(take),
      filterOptions
    })
  } catch (error) {
    console.error('EQUOS list sessions error:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/equos/sessions - Start a session
router.post('/sessions', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id
    const { 
      name, 
      avatar, 
      agent, 
      maxDuration, 
      additionalCtx, 
      templateVars,
      consumerIdentity,
      client,
      host,
      remoteAgentConnectingIdentity
    } = req.body
    
    if (!name || !avatar) {
      return res.status(400).json({ error: 'name and avatar are required' })
    }
    
    const sessionData = {
      name,
      avatar, // Can be { id: 'existing-id' } or full CreateEquosAvatarRequest
      ...(agent && { agent }), // Can be { id: 'existing-id' } or full CreateEquosAgentRequest
      ...(maxDuration && { maxDuration }),
      ...(additionalCtx && { additionalCtx }),
      ...(templateVars && { templateVars }),
      ...(consumerIdentity && { consumerIdentity }),
      ...(client && { client }),
      ...(host && { host }),
      ...(remoteAgentConnectingIdentity && { remoteAgentConnectingIdentity })
    }
    
    const result = await equosRequest('POST', '/v1/sessions', sessionData)
    
    // Log session start to local database for usage tracking
    if (result.ok && result.data?.session) {
      const session = result.data.session
      try {
        await db.query(`
          INSERT INTO equos_session_logs (
            equos_session_id, user_id, avatar_id, avatar_name, 
            agent_id, agent_name, session_name, started_at, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
          ON CONFLICT (equos_session_id) DO NOTHING
        `, [
          session.id,
          userId,
          session.avatarId || avatar?.id || null,
          session.avatar?.name || null,
          session.agentId || agent?.id || null,
          session.agent?.name || null,
          session.name || name,
          session.startedAt || new Date().toISOString()
        ])
        console.log('[Session Tracking] Logged session start:', session.id, 'for user:', userId)
        
        // Look up vision setting from local agents table
        const agentId = session.agentId || session.agent?.id
        if (agentId) {
          const visionResult = await db.query(
            'SELECT vision FROM equos_agents WHERE equos_id = $1',
            [agentId]
          )
          if (visionResult.rows.length > 0 && visionResult.rows[0].vision) {
            // Inject vision into the agent response
            if (result.data.session.agent) {
              result.data.session.agent.vision = true
            }
          }
        }
      } catch (logErr) {
        console.error('[Session Tracking] Failed to log session start:', logErr)
        // Don't fail the request if logging fails
      }
    }
    
    res.status(result.status).json(result.data)
  } catch (error) {
    console.error('EQUOS start session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/equos/sessions/:id - Get session by ID (checks local DB for transcript first)
router.get('/sessions/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const { includeTranscript } = req.query
    
    // Get local session data with user/agent info
    const localResult = await db.query(`
      SELECT 
        esl.equos_session_id,
        esl.user_id,
        esl.avatar_id,
        esl.avatar_name,
        esl.agent_id,
        esl.agent_name,
        esl.session_name,
        esl.started_at,
        esl.ended_at,
        esl.duration_seconds,
        esl.external_user_id,
        esl.transcript,
        esl.status as local_status,
        u.email as user_email,
        u.name as user_name,
        ea.vision as agent_vision,
        ea.provider as agent_provider,
        ea.model as agent_model
      FROM equos_session_logs esl
      LEFT JOIN users u ON esl.user_id = u.id
      LEFT JOIN equos_agents ea ON esl.agent_id = ea.equos_id
      WHERE esl.equos_session_id = $1
    `, [id])
    
    // Fetch from EQUOS API
    const result = await equosRequest('GET', `/v1/sessions/${id}`)
    
    if (!result.ok) {
      return res.status(result.status).json(result.data)
    }
    
    const equosSession = result.data
    const local = localResult.rows[0] || {}
    
    // Determine session transcript
    let transcript = local.transcript || null
    
    // If transcript requested and not in local DB, fetch from EQUOS
    const sessionEnded = equosSession.status === 'ended' || equosSession.endedAt || local.local_status === 'ended'
    if (includeTranscript === 'true' && !transcript && sessionEnded) {
      console.log('[Session] Fetching transcript from EQUOS for:', id)
      try {
        // EQUOS may have transcript in the session response
        if (equosSession.transcript) {
          console.log('[Session] Found transcript in session response')
          transcript = equosSession.transcript
        } else {
          // Try fetching with explicit transcript request
          console.log('[Session] Trying /transcript endpoint...')
          const transcriptResult = await equosRequest('GET', `/v1/sessions/${id}/transcript`)
          console.log('[Session] Transcript endpoint response:', { 
            ok: transcriptResult.ok, 
            status: transcriptResult.status,
            hasData: !!transcriptResult.data,
            dataType: typeof transcriptResult.data,
            dataKeys: transcriptResult.data && typeof transcriptResult.data === 'object' ? Object.keys(transcriptResult.data) : null
          })
          
          if (transcriptResult.ok && transcriptResult.data) {
            // The response might be the transcript directly or wrapped in an object
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
          await db.query(`
            UPDATE equos_session_logs 
            SET transcript = $1 
            WHERE equos_session_id = $2
          `, [JSON.stringify(transcript), id])
          console.log('[Session] Saved transcript to local DB for:', id)
        } else {
          console.log('[Session] No transcript content to save')
        }
      } catch (transcriptErr) {
        console.error('[Session] Failed to fetch transcript:', transcriptErr.message)
      }
    }
    
    // Build enriched response
    const enrichedSession = {
      id: equosSession.id,
      equosSessionId: equosSession.id,
      name: equosSession.name || local.session_name,
      status: equosSession.status || local.local_status || 'unknown',
      startedAt: equosSession.startedAt || local.started_at,
      endedAt: equosSession.endedAt || local.ended_at,
      durationSeconds: local.duration_seconds,
      externalUserId: local.external_user_id,
      visionEnabled: local.agent_vision || false,
      
      // User info
      user: local.user_id ? {
        id: local.user_id,
        email: local.user_email,
        name: local.user_name
      } : null,
      
      // Avatar info
      avatar: {
        id: equosSession.avatarId || local.avatar_id,
        name: equosSession.avatar?.name || local.avatar_name
      },
      
      // Agent info
      agent: {
        id: equosSession.agentId || local.agent_id,
        name: equosSession.agent?.name || local.agent_name,
        vision: local.agent_vision || false,
        provider: local.agent_provider || 'gemini',
        model: local.agent_model
      },
      
      // Transcript - include if requested and available
      transcript: includeTranscript === 'true' ? transcript : (transcript ? true : null),
      
      // Include raw EQUOS data for reference
      equosData: {
        roomName: equosSession.roomName,
        client: equosSession.client,
        maxDuration: equosSession.maxDuration
      }
    }
    
    res.json(enrichedSession)
  } catch (error) {
    console.error('EQUOS get session error:', error)
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/equos/sessions/:id/stop - End a session
router.patch('/sessions/:id/stop', verifyToken, async (req, res) => {
  try {
    const { id } = req.params
    const result = await equosRequest('PATCH', `/v1/sessions/${id}/stop`)
    
    // Update session log with end time, duration, and fetch transcript
    if (result.ok) {
      try {
        const endedAt = result.data?.endedAt || new Date().toISOString()
        
        // Fetch full session data to get transcript
        const fullSession = await equosRequest('GET', `/v1/sessions/${id}`)
        const transcript = fullSession.ok && fullSession.data?.transcript 
          ? fullSession.data.transcript 
          : null
        
        await db.query(`
          UPDATE equos_session_logs 
          SET ended_at = $1, 
              status = 'ended',
              duration_seconds = EXTRACT(EPOCH FROM ($1::timestamp - started_at))::integer,
              transcript = $3
          WHERE equos_session_id = $2
        `, [endedAt, id, transcript ? JSON.stringify(transcript) : null])
        console.log('[Session Tracking] Logged session end with transcript:', id)
      } catch (logErr) {
        console.error('[Session Tracking] Failed to log session end:', logErr)
      }
    }
    
    res.status(result.status).json(result.data)
  } catch (error) {
    console.error('EQUOS stop session error:', error)
    res.status(500).json({ error: error.message })
  }
})

module.exports = router
