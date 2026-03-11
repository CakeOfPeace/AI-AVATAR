require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })

const { Pool } = require('pg')

const OLD_API_KEY = 'sk_IwYKytERDJwSLMKhRhmRW1gJh56JFi46Mc4opvXxqi8kG'
const NEW_API_KEY = 'sk_dKR5kcEFsMhI56NmbGHgQt8ttX3RmYCejOnSeUpqtQCk5'
const EQUOS_API_BASE = 'https://api.equos.ai'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://avatar_admin:avatar_secure_2026@localhost:5432/avatar_dashboard'
})

async function equosRequest(method, endpoint, body, apiKey) {
  const headers = { 'x-api-key': apiKey }
  const options = { method, headers }

  if (body && (method === 'POST' || method === 'PUT')) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
  }

  const url = `${EQUOS_API_BASE}${endpoint}`
  const response = await fetch(url, options)

  const contentType = response.headers.get('content-type')
  let data = null
  if (contentType && contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  return { status: response.status, ok: response.ok, data }
}

async function downloadImageAsBase64(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`)
  }
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const ext = url.split('.').pop().split('?')[0].toLowerCase()
  const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
  return `data:${mimeType};base64,${base64}`
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function migrate() {
  console.log('='.repeat(60))
  console.log('EQUOS Account Migration')
  console.log('='.repeat(60))
  console.log(`Old API Key: ${OLD_API_KEY.slice(0, 10)}...`)
  console.log(`New API Key: ${NEW_API_KEY.slice(0, 10)}...`)
  console.log()

  // Step 1: Fetch all agents and avatars from OLD Equos account
  console.log('[1/6] Fetching agents from OLD Equos account...')
  const oldAgentsRes = await equosRequest('GET', '/v1/agents?take=100&skip=0', null, OLD_API_KEY)
  if (!oldAgentsRes.ok) {
    console.error('Failed to fetch old agents:', oldAgentsRes.data)
    process.exit(1)
  }
  const oldAgents = oldAgentsRes.data.agents || []
  console.log(`  Found ${oldAgents.length} agents on old account`)

  console.log('[2/6] Fetching avatars from OLD Equos account...')
  const oldAvatarsRes = await equosRequest('GET', '/v1/avatars?take=100&skip=0', null, OLD_API_KEY)
  if (!oldAvatarsRes.ok) {
    console.error('Failed to fetch old avatars:', oldAvatarsRes.data)
    process.exit(1)
  }
  const oldAvatars = oldAvatarsRes.data.avatars || []
  console.log(`  Found ${oldAvatars.length} avatars on old account`)

  // Build lookup maps from old API data
  const oldAgentMap = {}
  for (const agent of oldAgents) {
    oldAgentMap[agent.id] = agent
  }
  const oldAvatarMap = {}
  for (const avatar of oldAvatars) {
    oldAvatarMap[avatar.id] = avatar
  }

  // Step 2: Get local DB records
  console.log('\n[3/6] Reading local database records...')
  const localAgents = (await pool.query(
    'SELECT * FROM equos_agents ORDER BY id'
  )).rows
  const localAvatars = (await pool.query(
    'SELECT * FROM equos_avatars ORDER BY id'
  )).rows
  console.log(`  ${localAgents.length} agents in local DB`)
  console.log(`  ${localAvatars.length} avatars in local DB`)

  // Step 3: Check which agents are already on the new account (resume support)
  console.log('\n[4/6] Checking agents on NEW Equos account...')
  const newAgentsRes = await equosRequest('GET', '/v1/agents?take=100&skip=0', null, NEW_API_KEY)
  const newExistingAgents = newAgentsRes.ok ? (newAgentsRes.data.agents || []) : []
  const newExistingAgentNames = new Set(newExistingAgents.map(a => a.id))
  console.log(`  ${newExistingAgents.length} agents already exist on new account`)

  const agentIdMapping = {} // old_equos_id -> new_equos_id

  // Check if local DB already has new IDs (agents already migrated in prior run)
  for (const localAgent of localAgents) {
    const existsOnNew = newExistingAgents.find(a => a.id === localAgent.equos_id)
    if (existsOnNew) {
      // This agent was already migrated - the local DB equos_id points to the new account
      // We need the old ID to map avatar references. Find it from old API by name match.
      const oldAgent = oldAgents.find(a => a.name === localAgent.name && !agentIdMapping[a.id])
      if (oldAgent) {
        agentIdMapping[oldAgent.id] = localAgent.equos_id
        console.log(`  Already migrated: "${localAgent.name}" old:${oldAgent.id} -> new:${localAgent.equos_id}`)
      }
    }
  }

  // Create agents that haven't been migrated yet
  for (const localAgent of localAgents) {
    const oldEquosId = localAgent.equos_id
    const oldApiAgent = oldAgentMap[oldEquosId]

    // Skip if this local record already points to a new account agent
    if (newExistingAgents.find(a => a.id === oldEquosId)) {
      continue
    }

    if (!oldApiAgent) {
      console.log(`  SKIP agent "${localAgent.name}" (${oldEquosId}) - not found in old API, likely orphaned local record`)
      continue
    }

    const agentData = {
      name: oldApiAgent.name,
      provider: oldApiAgent.provider || 'gemini',
      model: oldApiAgent.model || 'gemini-2.5-flash-native-audio-preview-09-2025',
      voice: oldApiAgent.voice || 'Puck',
      ...(oldApiAgent.instructions && { instructions: oldApiAgent.instructions }),
      ...(oldApiAgent.greetingMsg && { greetingMsg: oldApiAgent.greetingMsg }),
      ...(typeof oldApiAgent.search === 'boolean' && { search: oldApiAgent.search }),
      ...(typeof oldApiAgent.emotions === 'boolean' && { emotions: oldApiAgent.emotions }),
      ...(typeof oldApiAgent.memory === 'boolean' && { memory: oldApiAgent.memory })
    }

    console.log(`  Creating agent: "${agentData.name}" (owner: user_id=${localAgent.user_id})...`)
    const result = await equosRequest('POST', '/v1/agents', agentData, NEW_API_KEY)

    if (!result.ok) {
      console.error(`  FAILED to create agent "${agentData.name}":`, result.data)
      continue
    }

    const newAgent = result.data
    agentIdMapping[oldEquosId] = newAgent.id
    console.log(`    OLD: ${oldEquosId} -> NEW: ${newAgent.id}`)

    await pool.query(
      `UPDATE equos_agents SET equos_id = $1, organization_id = $2, updated_at = NOW() WHERE equos_id = $3`,
      [newAgent.id, newAgent.organizationId, oldEquosId]
    )

    await sleep(500)
  }

  console.log(`\n  Agent ID mappings resolved: ${Object.keys(agentIdMapping).length}`)

  // Step 4: Recreate avatars on the new account
  console.log('\n[5/6] Creating avatars on NEW Equos account...')
  const avatarIdMapping = {} // old_equos_id -> new_equos_id

  for (const localAvatar of localAvatars) {
    const oldEquosId = localAvatar.equos_id
    const oldApiAvatar = oldAvatarMap[oldEquosId]

    if (!oldApiAvatar) {
      console.log(`  SKIP avatar "${localAvatar.name}" (${oldEquosId}) - not found in old API`)
      continue
    }

    // Download thumbnail from old account and convert to base64 data URI
    const thumbnailUrl = oldApiAvatar.thumbnailUrl
    if (!thumbnailUrl) {
      console.log(`  SKIP avatar "${localAvatar.name}" - no thumbnailUrl available to use as refImage`)
      continue
    }

    let refImage
    try {
      console.log(`    Downloading image: ${thumbnailUrl.slice(0, 80)}...`)
      refImage = await downloadImageAsBase64(thumbnailUrl)
      console.log(`    Downloaded (${Math.round(refImage.length / 1024)}KB base64)`)
    } catch (dlErr) {
      console.log(`  SKIP avatar "${localAvatar.name}" - failed to download image: ${dlErr.message}`)
      continue
    }

    // Map the old agent ID to the new agent ID
    // The local DB agent_id might already be the new ID (from prior agent migration)
    // or might still be the old ID
    const localAgentId = localAvatar.agent_id
    let newAgentId = agentIdMapping[localAgentId] // try old->new mapping
    if (!newAgentId) {
      // Check if localAgentId is already a new account agent
      const isAlreadyNew = newExistingAgents.find(a => a.id === localAgentId)
      if (isAlreadyNew) {
        newAgentId = localAgentId
      }
    }

    if (localAgentId && !newAgentId) {
      console.log(`  WARNING: avatar "${localAvatar.name}" linked to agent ${localAgentId} which wasn't migrated`)
    }

    const avatarData = {
      name: oldApiAvatar.name,
      identity: oldApiAvatar.identity,
      refImage: refImage,
      ...(newAgentId && { agentId: newAgentId })
    }

    console.log(`  Creating avatar: "${avatarData.name}" (owner: user_id=${localAvatar.user_id})...`)
    const result = await equosRequest('POST', '/v1/avatars', avatarData, NEW_API_KEY)

    if (!result.ok) {
      console.error(`  FAILED to create avatar "${avatarData.name}":`, result.data)

      // If identity conflict, try with a new identity
      if (result.status === 409 || (result.data && JSON.stringify(result.data).includes('identity'))) {
        const newIdentity = `${avatarData.identity}-v2`
        console.log(`    Retrying with new identity: ${newIdentity}`)
        avatarData.identity = newIdentity
        const retryResult = await equosRequest('POST', '/v1/avatars', avatarData, NEW_API_KEY)
        if (!retryResult.ok) {
          console.error(`    RETRY FAILED:`, retryResult.data)
          continue
        }
        const newAvatar = retryResult.data
        avatarIdMapping[oldEquosId] = newAvatar.id
        console.log(`    OLD: ${oldEquosId} -> NEW: ${newAvatar.id} (new identity: ${newIdentity})`)

        await pool.query(
          `UPDATE equos_avatars SET equos_id = $1, organization_id = $2, identity = $3, agent_id = $4, updated_at = NOW() WHERE equos_id = $5`,
          [newAvatar.id, newAvatar.organizationId, newIdentity, newAgentId || localAvatar.agent_id, oldEquosId]
        )
        await sleep(500)
        continue
      }
      continue
    }

    const newAvatar = result.data
    avatarIdMapping[oldEquosId] = newAvatar.id
    console.log(`    OLD: ${oldEquosId} -> NEW: ${newAvatar.id}`)

    // Update local DB record
    await pool.query(
      `UPDATE equos_avatars SET equos_id = $1, organization_id = $2, agent_id = $3, updated_at = NOW() WHERE equos_id = $4`,
      [newAvatar.id, newAvatar.organizationId, newAgentId || localAvatar.agent_id, oldEquosId]
    )

    await sleep(500)
  }

  console.log(`\n  Avatar migration complete: ${Object.keys(avatarIdMapping).length} migrated`)

  // Step 5: Update session logs with new agent/avatar IDs
  console.log('\n[6/6] Updating session logs with new IDs...')
  let updatedSessions = 0

  for (const [oldAgentId, newAgentId] of Object.entries(agentIdMapping)) {
    const result = await pool.query(
      'UPDATE equos_session_logs SET agent_id = $1 WHERE agent_id = $2',
      [newAgentId, oldAgentId]
    )
    if (result.rowCount > 0) {
      console.log(`  Updated ${result.rowCount} session(s) agent_id: ${oldAgentId} -> ${newAgentId}`)
      updatedSessions += result.rowCount
    }
  }

  for (const [oldAvatarId, newAvatarId] of Object.entries(avatarIdMapping)) {
    const result = await pool.query(
      'UPDATE equos_session_logs SET avatar_id = $1 WHERE avatar_id = $2',
      [newAvatarId, oldAvatarId]
    )
    if (result.rowCount > 0) {
      console.log(`  Updated ${result.rowCount} session(s) avatar_id: ${oldAvatarId} -> ${newAvatarId}`)
      updatedSessions += result.rowCount
    }
  }

  console.log(`  Updated ${updatedSessions} session log entries total`)

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('MIGRATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Agents migrated:  ${Object.keys(agentIdMapping).length}/${localAgents.length}`)
  console.log(`Avatars migrated: ${Object.keys(avatarIdMapping).length}/${localAvatars.length}`)
  console.log(`Session logs updated: ${updatedSessions}`)
  console.log()
  console.log('ID Mappings (old -> new):')
  console.log('\nAgents:')
  for (const [oldId, newId] of Object.entries(agentIdMapping)) {
    const agent = localAgents.find(a => a.equos_id === oldId)
    console.log(`  ${agent?.name || 'Unknown'}: ${oldId} -> ${newId}`)
  }
  console.log('\nAvatars:')
  for (const [oldId, newId] of Object.entries(avatarIdMapping)) {
    const avatar = localAvatars.find(a => a.equos_id === oldId)
    console.log(`  ${avatar?.name || 'Unknown'}: ${oldId} -> ${newId}`)
  }

  console.log('\nDone! Restart the server (pm2 restart all) to pick up the changes.')

  await pool.end()
}

migrate().catch(err => {
  console.error('Migration failed:', err)
  pool.end()
  process.exit(1)
})
