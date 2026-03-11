# Avatar Platform API Documentation

Complete API reference for the Avatar Platform. This documentation covers all endpoints, authentication, limitations, and code examples.

## Table of Contents
- [Authentication](#authentication)
- [Base URL](#base-url)
- [System Limitations](#system-limitations)
- [Avatars](#avatars)
- [Sessions](#sessions)
- [Vision Feature](#vision-feature)
- [Available Voices](#available-voices)
- [Error Handling](#errors)
- [Rate Limits](#rate-limits)
- [Code Examples](#code-examples)
- [UI Integration Guide](#ui-integration-guide)

---

## Authentication

All API requests must include your API Key in the `x-api-key` header.

```bash
curl -X GET https://avatar.zainlee.com/api/v1/avatars \
  -H "x-api-key: sk_live_..."
```

### Getting an API Key
1. Log in to the Avatar Platform dashboard
2. Navigate to **API Keys** section
3. Click **Generate New Key**
4. Copy and securely store your key (shown only once)

**Note:** API keys are tied to your account tier. Free tier accounts do not have API access.

---

## Base URL

```
https://avatar.zainlee.com/api/v1
```

All endpoints are relative to this base URL.

---

## System Limitations

### Image Upload Requirements
| Requirement | Value |
|-------------|-------|
| Max File Size | 10MB |
| Supported Formats | JPEG, PNG |
| Encoding | Base64 with data URI prefix |
| Recommended Resolution | 512x512 to 1024x1024 pixels |

**Example Base64 format:**
```
data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD...
```

### Text Limits
| Field | Max Length |
|-------|------------|
| Instructions (System Prompt) | 5,500 characters |
| Greeting Message | 1,000 characters |
| Avatar Name | 255 characters |
| Session Name | 255 characters |
| Additional Context | 2,000 characters |

### Session Limits
| Setting | Value |
|---------|-------|
| Max Call Duration | 7,200 seconds (2 hours) |
| Default Call Duration | 600 seconds (10 minutes) |
| Min Call Duration | 60 seconds (1 minute) |

---

## Avatars

### List Avatars
Get a list of all avatars you have created.

```http
GET /avatars
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `take` | integer | 50 | Number of records to return (max 100) |
| `skip` | integer | 0 | Number of records to skip for pagination |

**Response:**
```json
{
  "data": [
    {
      "id": "avatar_abc123",
      "name": "Customer Support",
      "identity": "avatar-customer-support",
      "thumbnailUrl": "https://...",
      "agentId": "agent_xyz789",
      "organizationId": "org_123"
    }
  ],
  "meta": {
    "total": 1,
    "take": 50,
    "skip": 0
  }
}
```

---

### Get Avatar
Get details for a specific avatar.

```http
GET /avatars/:id
```

**Response:**
```json
{
  "data": {
    "id": "avatar_abc123",
    "name": "Customer Support",
    "identity": "avatar-customer-support",
    "thumbnailUrl": "https://...",
    "refImage": "https://...",
    "agentId": "agent_xyz789",
    "agent": {
      "id": "agent_xyz789",
      "name": "Customer Support",
      "provider": "gemini",
      "model": "gemini-2.5-flash-native-audio-preview-09-2025",
      "voice": "Puck",
      "instructions": "...",
      "vision": true
    }
  }
}
```

---

### Create Avatar
Create a new AI avatar. This process automatically creates both the visual avatar and the underlying AI agent in a single request.

```http
POST /avatars
```

**Request Body:**
```json
{
  "name": "My AI Assistant",
  "refImage": "data:image/jpeg;base64,...",
  "voice": "Puck",
  "instructions": "You are a helpful customer service assistant. Be friendly and professional.",
  "greetingMsg": "Hello! How can I help you today?",
  "vision": true,
  "search": false,
  "emotions": true,
  "memory": false
}
```

**Parameters:**
| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `name` | Yes | string | Name for the avatar (max 255 chars) |
| `refImage` | Yes | string | Base64 encoded image with data URI prefix |
| `identity` | No | string | Unique identifier (auto-generated if not provided) |
| `voice` | No | string | Voice to use (default: "Puck"). See [Available Voices](#available-voices) |
| `instructions` | No | string | System prompt defining behavior (max 5,500 chars) |
| `greetingMsg` | No | string | Initial message when session starts (max 1,000 chars) |
| `vision` | No | boolean | Enable camera input - avatar can see user (default: false) |
| `search` | No | boolean | Enable web search capability (default: false) |
| `emotions` | No | boolean | Enable emotional expressions (default: false) |
| `memory` | No | boolean | Enable conversation memory (default: false) |

**Response (201 Created):**
```json
{
  "data": {
    "avatar": {
      "id": "avatar_abc123",
      "name": "My AI Assistant",
      "identity": "avatar-1704067200",
      "thumbnailUrl": "https://...",
      "agentId": "agent_xyz789"
    },
    "agent": {
      "id": "agent_xyz789",
      "name": "My AI Assistant",
      "provider": "gemini",
      "model": "gemini-2.5-flash-native-audio-preview-09-2025",
      "voice": "Puck",
      "vision": true
    }
  }
}
```

**Note:** The avatar creation process:
1. Creates the AI agent with your configuration
2. Processes the reference image
3. Creates the avatar linked to the agent
4. Returns both entities

This typically takes 5-15 seconds depending on image size.

---

### Update Avatar
Update an existing avatar's configuration.

```http
PATCH /avatars/:id
```

**Request Body (all fields optional):**
```json
{
  "name": "Updated Assistant Name",
  "instructions": "Updated system prompt...",
  "greetingMsg": "New greeting message",
  "voice": "Aoede",
  "vision": true,
  "emotions": true,
  "search": false,
  "memory": true
}
```

**Updatable Fields:**
| Field | Description |
|-------|-------------|
| `name` | Update avatar and agent name |
| `instructions` | Update system prompt |
| `greetingMsg` | Update greeting message |
| `voice` | Change voice |
| `vision` | Enable/disable vision |
| `search` | Enable/disable web search |
| `emotions` | Enable/disable emotions |
| `memory` | Enable/disable memory |

**Note:** The following cannot be changed after creation:
- Reference image (`refImage`)
- Identity (`identity`)

---

### Delete Avatar
Delete an avatar and its associated AI agent.

```http
DELETE /avatars/:id
```

**Response:**
```json
{
  "message": "Avatar deleted successfully"
}
```

**Warning:** This action is irreversible and will also delete:
- The linked AI agent
- All session history
- Any stored transcripts

---

## Sessions

Sessions allow real-time voice/video interaction with avatars via WebRTC (LiveKit).

### List Sessions
Get a list of your session history. **For external systems**, use `externalUserId` to filter sessions by your end-users.

```http
GET /sessions
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `take` | integer | 50 | Number of records to return |
| `skip` | integer | 0 | Number of records to skip |
| `avatarId` | string | - | Filter by avatar ID |
| `externalUserId` | string | - | **Filter by your system's user ID** (from `consumerIdentity.identity`) |

**Response:**
```json
{
  "data": [
    {
      "equos_session_id": "session_abc123",
      "avatar_id": "avatar_xyz",
      "avatar_name": "Customer Support",
      "agent_name": "Customer Support",
      "session_name": "Customer Inquiry",
      "started_at": "2024-01-15T10:30:00Z",
      "ended_at": "2024-01-15T10:35:00Z",
      "duration_seconds": 300,
      "status": "ended",
      "external_user_id": "your-user-123",
      "external_user_name": "John Doe"
    }
  ],
  "meta": {
    "total": 42,
    "take": 50,
    "skip": 0
  }
}
```

**Example - Get sessions for a specific user in your system:**
```bash
curl -X GET "https://avatar.zainlee.com/api/v1/sessions?externalUserId=user-123" \
  -H "x-api-key: sk_live_..."
```

---

### Get Session Details
Get details for a specific session, optionally with transcript.

```http
GET /sessions/:id
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `includeTranscript` | boolean | false | Include full conversation transcript in response |

**Transcript Behavior:**
- When `includeTranscript=false` (default): The `transcript` field returns `true` if a transcript exists, or `null` if not
- When `includeTranscript=true`: The full transcript content is returned
- Transcripts are only available for **ended** sessions
- Transcripts are fetched from EQUOS on first request and cached locally for faster subsequent access
- The transcript is automatically fetched and stored when you call `POST /sessions/:id/stop`

**Response (with includeTranscript=true):**
```json
{
  "data": {
    "id": "session_abc123",
    "name": "Customer Inquiry",
    "status": "ended",
    "startedAt": "2024-01-15T10:30:00Z",
    "endedAt": "2024-01-15T10:35:00Z",
    "durationSeconds": 300,
    "avatarId": "avatar_xyz",
    "avatarName": "Customer Support",
    "agentId": "agent_xyz",
    "agentName": "Support Agent",
    "externalUserId": "alice-123",
    "transcript": [
      {
        "role": "agent",
        "content": "Hello! How can I help you today?",
        "timestamp": "2024-01-15T10:30:05Z"
      },
      {
        "role": "user",
        "content": "I need help with my order",
        "timestamp": "2024-01-15T10:30:15Z"
      }
    ]
  }
}
```

**Response (with includeTranscript=false or omitted):**
```json
{
  "data": {
    "id": "session_abc123",
    "name": "Customer Inquiry",
    "status": "ended",
    "startedAt": "2024-01-15T10:30:00Z",
    "endedAt": "2024-01-15T10:35:00Z",
    "durationSeconds": 300,
    "avatarId": "avatar_xyz",
    "avatarName": "Customer Support",
    "agentId": "agent_xyz",
    "agentName": "Support Agent",
    "externalUserId": "alice-123",
    "transcript": true
  }
}
```
Note: `transcript: true` indicates a transcript exists. Pass `?includeTranscript=true` to get the full content.

---

### Start Session
Start a real-time interaction session with an avatar.

```http
POST /sessions
```

**Request Body:**
```json
{
  "avatarId": "avatar_abc123",
  "name": "Customer Inquiry Session",
  "maxDuration": 600,
  "additionalCtx": "Customer is asking about order #12345",
  "consumerIdentity": {
    "identity": "user-12345",
    "name": "John Doe"
  }
}
```

**Parameters:**
| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `avatarId` | Yes | string | ID of the avatar to use |
| `name` | No | string | Session name for tracking (default: "API Session") |
| `maxDuration` | No | integer | Max duration in seconds (default: 600, max: 7200) |
| `additionalCtx` | No | string | Extra context for the AI (max 2,000 chars) |
| `consumerIdentity` | **Recommended** | object | **Your system's user identity for tracking** |
| `templateVars` | No | object | Variables for template substitution in prompts |

**Consumer Identity (Important for External Systems):**

The `consumerIdentity` object is used to track sessions per your end-user:

```json
{
  "consumerIdentity": {
    "identity": "your-user-id-123",  // Your system's user ID - used for filtering
    "name": "John Doe"               // Display name
  }
}
```

- `identity`: **This is stored as `external_user_id`** and can be used to filter sessions later via `GET /sessions?externalUserId=your-user-id-123`
- `name`: Stored as `external_user_name` for display purposes

**Best Practice:** Always pass your user's unique ID in `consumerIdentity.identity` to easily retrieve their session history later.

**Response (201 Created):**
```json
{
  "data": {
    "session": {
      "id": "session_abc123",
      "name": "Customer Inquiry Session",
      "status": "active",
      "host": {
        "serverUrl": "wss://livekit.example.com"
      },
      "avatar": {
        "id": "avatar_abc123",
        "name": "Customer Support"
      },
      "agent": {
        "id": "agent_xyz789",
        "name": "Customer Support",
        "vision": true
      },
      "startedAt": "2024-01-15T10:30:00Z"
    },
    "consumerAccessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### Connecting to a Session

Use the LiveKit SDK to connect:

```javascript
import { Room } from 'livekit-client';

const room = new Room();

// Connect to the session
await room.connect(
  data.session.host.serverUrl, 
  data.consumerAccessToken
);

// Enable microphone for voice input
await room.localParticipant.setMicrophoneEnabled(true);

// If vision is enabled, enable camera
if (data.session.agent?.vision) {
  await room.localParticipant.setCameraEnabled(true);
}

// Listen for avatar video track
room.on('trackSubscribed', (track, publication, participant) => {
  if (track.kind === 'video' && !participant.identity.startsWith('user-')) {
    // This is the avatar's video
    const videoElement = document.getElementById('avatar-video');
    track.attach(videoElement);
  }
});
```

---

### Stop Session
End an active session.

```http
POST /sessions/:id/stop
```

**Response:**
```json
{
  "data": {
    "id": "session_abc123",
    "status": "ended",
    "endedAt": "2024-01-15T10:35:00Z"
  }
}
```

---

## Vision Feature

When an avatar is created with `vision: true`, the AI can see through the user's camera during sessions.

### How Vision Works

1. **Create avatar with vision enabled:**
```bash
curl -X POST https://avatar.zainlee.com/api/v1/avatars \
  -H "x-api-key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Visual Assistant",
    "refImage": "data:image/jpeg;base64,...",
    "vision": true,
    "instructions": "You can see the user through their camera. Describe what you see when asked."
  }'
```

2. **Start session and connect with camera:**
```javascript
// Start session
const sessionRes = await fetch('/api/v1/sessions', {
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ avatarId })
});
const { data } = await sessionRes.json();

// Connect with camera enabled
const room = new Room();
await room.connect(data.session.host.serverUrl, data.consumerAccessToken);
await room.localParticipant.setMicrophoneEnabled(true);
await room.localParticipant.setCameraEnabled(true); // Enable camera for vision
```

3. **The AI processes video frames** and can respond to visual input in real-time.

### Vision Use Cases
- Visual assistance and descriptions
- Product demonstrations
- Remote support with screen sharing
- Interactive tutorials
- Accessibility assistance

---

## External System Integration

If you're building a platform that uses our Avatar API for your own users, here's the recommended approach:

### Architecture Overview

```
Your System                           Avatar Platform
────────────────                      ────────────────
Your Admin Account  ◄────────────►   Single API Key
       │
       │ (your users)
       ▼
User "alice-123"  ──────────────►   Session with consumerIdentity.identity="alice-123"
User "bob-456"    ──────────────►   Session with consumerIdentity.identity="bob-456"
User "carol-789"  ──────────────►   Session with consumerIdentity.identity="carol-789"
```

### Workflow

**1. Setup (One-time)**
- Create an account on Avatar Platform
- Generate an API key from the dashboard
- Create your avatars

**2. For Each User Session**
```javascript
// When your user "alice-123" wants to talk to an avatar
const response = await fetch('https://avatar.zainlee.com/api/v1/sessions', {
  method: 'POST',
  headers: {
    'x-api-key': 'your-api-key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    avatarId: 'your-avatar-id',
    consumerIdentity: {
      identity: 'alice-123',      // Your user's ID
      name: 'Alice Smith'         // Your user's display name
    }
  })
});
```

**3. Retrieve User's Session History**
```javascript
// Get all sessions for alice-123
const sessions = await fetch(
  'https://avatar.zainlee.com/api/v1/sessions?externalUserId=alice-123',
  { headers: { 'x-api-key': 'your-api-key' } }
);

// Returns only sessions where consumerIdentity.identity was "alice-123"
```

### Benefits

| Feature | Description |
|---------|-------------|
| **Single API Key** | No need to create users in our system |
| **Per-User Tracking** | Sessions automatically tagged with your user IDs |
| **Easy Filtering** | Retrieve sessions by `externalUserId` |
| **Status Sync** | Session status automatically syncs when you fetch |
| **Full Isolation** | Your users only see their own data |

### Important Fields

| Field | Where Used | Purpose |
|-------|------------|---------|
| `consumerIdentity.identity` | POST /sessions | Your user's unique ID |
| `consumerIdentity.name` | POST /sessions | Your user's display name |
| `external_user_id` | GET /sessions response | Same as consumerIdentity.identity |
| `external_user_name` | GET /sessions response | Same as consumerIdentity.name |
| `?externalUserId=` | GET /sessions query | Filter by your user ID |

---

## Available Voices

| Voice | Gender | Accent | Best For |
|-------|--------|--------|----------|
| Puck | Male | British | Professional, formal |
| Charon | Male | American | Casual, friendly |
| Kore | Female | Australian | Warm, approachable |
| Fenrir | Male | American | Authoritative |
| Aoede | Female | American | Clear, professional |
| Leda | Female | British | Elegant, refined |
| Orus | Male | American | Deep, resonant |
| Zephyr | Female | American | Gentle, soothing |

---

## Errors

The API uses standard HTTP status codes:

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API Key |
| 403 | Forbidden - Access denied |
| 404 | Not Found - Resource doesn't exist |
| 413 | Payload Too Large - Image exceeds 10MB |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

**Error Response Format:**
```json
{
  "error": "Descriptive error message",
  "details": { ... }  // Optional additional info
}
```

### Common Errors

**Invalid API Key:**
```json
{
  "error": "Invalid or expired API key"
}
```

**Instructions Too Long:**
```json
{
  "error": "Instructions exceed maximum length of 5500 characters"
}
```

**Image Too Large:**
```json
{
  "error": "Image exceeds maximum size of 10MB"
}
```

---

## Rate Limits

| Tier | API Calls | Concurrent Sessions |
|------|-----------|---------------------|
| Starter | 100/minute | 2 |
| Business | 500/minute | 10 |
| Custom | Unlimited | Custom |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704067200
```

---

## Code Examples

### Node.js - Complete Integration

```javascript
const API_KEY = 'sk_live_...';
const BASE_URL = 'https://avatar.zainlee.com/api/v1';

// Helper for API calls
async function apiCall(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`${BASE_URL}${endpoint}`, options);
  return response.json();
}

// Create avatar with vision
async function createAvatar(name, imageBase64) {
  return apiCall('POST', '/avatars', {
    name,
    refImage: imageBase64,
    vision: true,
    emotions: true,
    instructions: `You are ${name}, a helpful AI assistant. 
    You can see the user through their camera.
    Be friendly, professional, and concise.`,
    greetingMsg: `Hello! I'm ${name}. How can I assist you today?`
  });
}

// Start session
async function startSession(avatarId, userName) {
  return apiCall('POST', '/sessions', {
    avatarId,
    name: `Session with ${userName}`,
    maxDuration: 600,
    consumerIdentity: {
      identity: `user-${Date.now()}`,
      name: userName
    }
  });
}

// Stop session
async function stopSession(sessionId) {
  return apiCall('POST', `/sessions/${sessionId}/stop`);
}

// Get session with transcript
async function getSessionTranscript(sessionId) {
  return apiCall('GET', `/sessions/${sessionId}?includeTranscript=true`);
}

// Example usage
async function main() {
  // Read image and convert to base64
  const fs = require('fs');
  const imageBuffer = fs.readFileSync('avatar-photo.jpg');
  const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
  
  // Create avatar
  const { data: avatarData } = await createAvatar('Sales Assistant', base64Image);
  console.log('Avatar created:', avatarData.avatar.id);
  
  // Start session
  const { data: sessionData } = await startSession(avatarData.avatar.id, 'John');
  console.log('Session started:', sessionData.session.id);
  console.log('Connect URL:', sessionData.session.host.serverUrl);
  console.log('Access Token:', sessionData.consumerAccessToken);
  
  // ... user interacts with avatar ...
  
  // Stop session
  await stopSession(sessionData.session.id);
  
  // Get transcript
  const { data: transcript } = await getSessionTranscript(sessionData.session.id);
  console.log('Transcript:', transcript.transcript);
}

main();
```

### Python - Complete Integration

```python
import requests
import base64
from pathlib import Path

API_KEY = 'sk_live_...'
BASE_URL = 'https://avatar.zainlee.com/api/v1'

def api_call(method, endpoint, json=None):
    """Make API call with authentication."""
    headers = {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
    }
    response = requests.request(
        method,
        f'{BASE_URL}{endpoint}',
        headers=headers,
        json=json
    )
    response.raise_for_status()
    return response.json()

def create_avatar(name, image_path, vision=True):
    """Create avatar from image file."""
    # Read and encode image
    image_bytes = Path(image_path).read_bytes()
    base64_image = base64.b64encode(image_bytes).decode('utf-8')
    
    # Determine mime type
    suffix = Path(image_path).suffix.lower()
    mime_type = 'image/jpeg' if suffix in ['.jpg', '.jpeg'] else 'image/png'
    
    return api_call('POST', '/avatars', {
        'name': name,
        'refImage': f'data:{mime_type};base64,{base64_image}',
        'vision': vision,
        'emotions': True,
        'instructions': f'''You are {name}, a helpful AI assistant.
        Be friendly and professional. Answer questions concisely.
        {'You can see the user through their camera.' if vision else ''}''',
        'greetingMsg': f"Hello! I'm {name}. How can I help you?"
    })

def start_session(avatar_id, user_name, max_duration=600):
    """Start a new session with the avatar."""
    return api_call('POST', '/sessions', {
        'avatarId': avatar_id,
        'name': f'Session with {user_name}',
        'maxDuration': max_duration,
        'consumerIdentity': {
            'identity': f'user-{user_name.lower().replace(" ", "-")}',
            'name': user_name
        }
    })

def stop_session(session_id):
    """Stop an active session."""
    return api_call('POST', f'/sessions/{session_id}/stop')

def get_transcript(session_id):
    """Get session transcript."""
    return api_call('GET', f'/sessions/{session_id}?includeTranscript=true')

def list_avatars():
    """List all avatars."""
    return api_call('GET', '/avatars')

def delete_avatar(avatar_id):
    """Delete an avatar."""
    return api_call('DELETE', f'/avatars/{avatar_id}')

# Example usage
if __name__ == '__main__':
    # Create avatar
    result = create_avatar('Support Agent', 'agent-photo.jpg')
    avatar_id = result['data']['avatar']['id']
    print(f'Created avatar: {avatar_id}')
    
    # Start session
    session = start_session(avatar_id, 'Customer')
    print(f'Session URL: {session["data"]["session"]["host"]["serverUrl"]}')
    print(f'Token: {session["data"]["consumerAccessToken"]}')
```

---

## UI Integration Guide

### How the Platform Works

The Avatar Platform UI follows this flow:

1. **Avatar Creation** (Create Avatar page)
   - User uploads a reference image
   - Configures AI behavior (instructions, voice, features)
   - System creates agent and avatar in one transaction
   - Avatar becomes available in the library

2. **Starting a Call** (My Avatars page)
   - Click "Start Call" on any avatar card
   - Session starts immediately with avatar's configured settings
   - Camera enabled automatically if vision is enabled
   - Call duration uses avatar's configured max duration

3. **During Call** (Call Interface)
   - Real-time video of the AI avatar
   - User's camera feed shown as picture-in-picture (if vision enabled)
   - Microphone for voice input
   - End call button with loading indicator

4. **After Call** (Session History)
   - View all past sessions
   - Filter by user or avatar
   - View transcripts for completed sessions
   - See duration and status

### Default Settings

When creating avatars, these defaults are applied:
- **Provider:** Gemini (always)
- **Model:** gemini-2.5-flash-native-audio-preview-09-2025
- **Voice:** Puck
- **Max Duration:** 10 minutes (600 seconds)
- **Vision:** Disabled
- **Search/Emotions/Memory:** Disabled

---

## Support

For API issues or questions:
- Email: support@avatar.zainlee.com
- Documentation: https://avatar.zainlee.com/api-docs

---

*Last updated: January 2026*
