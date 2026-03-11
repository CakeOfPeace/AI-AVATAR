const EQUOS_API_BASE = 'https://api.equos.ai'

// Get API key from environment
const getApiKey = () => {
  const apiKey = process.env.EQUOS_API_KEY
  if (!apiKey) {
    throw new Error('EQUOS_API_KEY environment variable is not set')
  }
  return apiKey
}

// Generic EQUOS API request helper
const equosRequest = async (method, endpoint, body = null) => {
  const apiKey = getApiKey()
  
  const headers = {
    'x-api-key': apiKey
  }
  
  const options = {
    method,
    headers
  }
  
  // Only set Content-Type and body for methods that have a body
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    headers['Content-Type'] = 'application/json'
    options.body = JSON.stringify(body)
    // Debug log for POST/PUT/PATCH requests
    if (endpoint.includes('sessions')) {
      console.log(`[EQUOS] Request body for ${endpoint}:`, options.body)
    }
  }
  
  const url = `${EQUOS_API_BASE}${endpoint}`
  console.log(`[EQUOS] ${method} ${url}`)
  
  try {
    const response = await fetch(url, options)
    
    const contentType = response.headers.get('content-type')
    let data = null
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      data = await response.text()
    }
    
    return {
      status: response.status,
      ok: response.ok,
      data
    }
  } catch (error) {
    console.error(`[EQUOS] Request failed: ${error.message}`)
    throw error
  }
}

module.exports = { equosRequest }
