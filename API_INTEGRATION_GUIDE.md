# Voice Agent API Integration Guide

This guide explains how external systems can programmatically start calls with voice agents in the Zainlee Livekit-Agent system.

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Integration Methods](#integration-methods)
  - [1. Playground API (Recommended for Web/App Integration)](#1-playground-api-recommended-for-webapp-integration)
    - [Avatar Support (Beyond Presence)](#avatar-support-beyond-presence)
  - [2. Embed API (For Widget Integration)](#2-embed-api-for-widget-integration)
  - [3. Twilio Integration (For Phone Calls)](#3-twilio-integration-for-phone-calls)
  - [4. Direct LiveKit SIP Integration](#4-direct-livekit-sip-integration)
- [Number Routing Configuration](#number-routing-configuration)
- [Complete Examples](#complete-examples)
  - [Example 6: Full Avatar Integration](#example-6-full-avatar-integration---python-backend--react-frontend)

---

## Overview

The system provides multiple APIs for integrating voice agents into external applications:

- **Base URL**: `https://voice.zainlee.com`
- **API Prefix**: `/api` (REQUIRED for external requests)
- **Authentication**: Bearer token (JWT) required for most endpoints

---

## Authentication

### 1. Register a User

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "your_username",
  "email": "your_email@example.com",
  "password": "your_secure_password"
}
```

**Response:**
```json
{
  "token": "abc123...",
  "user": {
    "id": "user_id",
    "username": "your_username",
    "email": "your_email@example.com",
    "role": "admin"
  }
}
```

### 2. Login (Existing User)

```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "your_email@example.com",
  "password": "your_secure_password"
}
```

**Response:** Same as registration

### 3. Use the Token

Include the token in all subsequent requests:

```bash
Authorization: Bearer YOUR_TOKEN_HERE
```

---

## Integration Methods

### 1. Playground API (Recommended for Web/App Integration)

The Playground API creates a LiveKit room and automatically spawns an agent worker for real-time voice conversations.

#### Endpoint: `POST /api/playground/start`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "agent_id": "your_agent_id",
  "room": "optional-room-name",
  "tools": [
    {
      "name": "get_weather",
      "description": "Get current weather for a location",
      "parameters": {
        "type": "object",
        "properties": {
          "location": {
            "type": "string",
            "description": "City name"
          }
        },
        "required": ["location"]
      },
      "implementation": {
        "type": "http_callback",
        "url": "https://your-api.com/tools/weather",
        "method": "POST",
        "headers": {
          "Authorization": "Bearer YOUR_TOOL_API_KEY"
        },
        "timeout": 10
      }
    }
  ],
  "tools_webhook": {
    "url": "https://your-api.com/tools/webhook",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer YOUR_WEBHOOK_KEY"
    },
    "timeout": 10
  }
}
```

**Response:**
```json
{
  "server_url": "wss://your-livekit-server.com",
  "room": "play-abc12345",
  "token": "eyJhbGc...",
  "identity": "user-xyz789"
}
```

**What Happens:**
1. A LiveKit room is created
2. An agent worker is spawned in the background
3. You receive connection credentials (token, server URL, room name)
4. Connect to LiveKit using their client SDKs

#### Stop the Session

```bash
POST /api/playground/stop
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "room": "play-abc12345"
}
```

#### Avatar Support (Beyond Presence)

The Playground API supports [Beyond Presence](https://www.beyondpresence.ai/) virtual avatars, which add hyper-realistic video output to your voice agents.

**Environment Variables Required:**

| Variable | Required | Description |
|----------|----------|-------------|
| `BEY_API_KEY` | Yes | Your Beyond Presence API key from [docs.bey.dev](https://docs.bey.dev/api-key) |
| `BEY_AVATAR_ID` | No | Default avatar ID (falls back to BEY stock avatar if not set) |

**Request Body with Avatar:**
```json
{
  "agent_id": "your_agent_id",
  "avatar": {
    "enabled": true,
    "avatar_id": "b9be11b8-89fb-4227-8f86-4a881393cbdb"
  }
}
```

**Response (with avatar):**
```json
{
  "server_url": "wss://your-livekit-server.com",
  "room": "play-abc12345",
  "token": "eyJhbGc...",
  "identity": "user-xyz789",
  "avatar": {
    "enabled": true,
    "avatar_id": "b9be11b8-89fb-4227-8f86-4a881393cbdb"
  }
}
```

**How It Works:**
1. The agent worker detects avatar mode via environment variables
2. A Beyond Presence avatar session is created before the agent session starts
3. The avatar joins the LiveKit room as a separate participant
4. Agent audio is automatically routed through the avatar for lip-sync
5. Users see video + synchronized audio from the avatar participant

**Frontend Integration:**

In React apps using LiveKit components, use the `useVoiceAssistant()` hook to automatically get the correct audio and video tracks:

```javascript
const { 
  agent,      // The agent participant
  audioTrack, // The avatar's audio track
  videoTrack, // The avatar's video track
} = useVoiceAssistant();
```

For custom frontends, identify the avatar worker by checking for the `lk.publish_on_behalf` attribute:

```javascript
const avatarWorker = room.remoteParticipants.find(
  p => p.kind === 'agent' && p.attributes['lk.publish_on_behalf']
);
```

#### Avatar Examples

**cURL - Start Avatar Session:**

```bash
curl -X POST "https://voice.zainlee.com/api/playground/start" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": "your_agent_id",
    "avatar": {
      "enabled": true,
      "avatar_id": "b9be11b8-89fb-4227-8f86-4a881393cbdb"
    }
  }'
```

**Response:**
```json
{
  "server_url": "wss://your-livekit-server.livekit.cloud",
  "room": "play-a1b2c3d4",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "identity": "user-xyz789",
  "avatar": {
    "enabled": true,
    "avatar_id": "b9be11b8-89fb-4227-8f86-4a881393cbdb"
  }
}
```

**Python - Start Avatar Session and Connect:**

```python
import requests

BASE_URL = "https://voice.zainlee.com"
API_TOKEN = "your_auth_token"

def start_avatar_session(agent_id, avatar_id=None):
    """Start a voice agent session with Beyond Presence avatar."""
    
    payload = {
        "agent_id": agent_id,
        "avatar": {
            "enabled": True,
            "avatar_id": avatar_id  # Optional - uses default if None
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/api/playground/start",
        headers={
            "Authorization": f"Bearer {API_TOKEN}",
            "Content-Type": "application/json"
        },
        json=payload
    )
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Avatar session started!")
        print(f"   Room: {data['room']}")
        print(f"   Server: {data['server_url']}")
        print(f"   Avatar enabled: {data.get('avatar', {}).get('enabled', False)}")
        return data
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        return None

# Usage
session = start_avatar_session(
    agent_id="your_agent_id",
    avatar_id="b9be11b8-89fb-4227-8f86-4a881393cbdb"
)

# Connect using LiveKit Python SDK
if session:
    from livekit import rtc
    import asyncio
    
    async def connect_to_avatar_agent():
        room = rtc.Room()
        await room.connect(session['server_url'], session['token'])
        print(f"Connected to room: {room.name}")
        
        # The avatar will appear as a participant with video
        # Your audio will be captured and the agent will respond through the avatar
        
    asyncio.run(connect_to_avatar_agent())
```

**Node.js - Start Avatar Session:**

```javascript
const axios = require('axios');

const BASE_URL = 'https://voice.zainlee.com';
const API_TOKEN = 'your_auth_token';

async function startAvatarSession(agentId, avatarId = null) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/playground/start`,
      {
        agent_id: agentId,
        avatar: {
          enabled: true,
          avatar_id: avatarId  // Optional
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Avatar session started!');
    console.log('   Room:', response.data.room);
    console.log('   Avatar:', response.data.avatar);
    
    return response.data;
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
startAvatarSession('your_agent_id', 'b9be11b8-89fb-4227-8f86-4a881393cbdb')
  .then(session => {
    // Use session.server_url and session.token with LiveKit client SDK
    console.log('Connect to:', session.server_url);
  });
```

**React - Complete Avatar Video Chat Component:**

```jsx
import { useEffect, useState } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  useConnectionState,
} from '@livekit/components-react';
import '@livekit/components-styles';

// Avatar Voice Agent Component
function AvatarAgent() {
  const { agent, state, audioTrack, videoTrack } = useVoiceAssistant();
  
  return (
    <div className="avatar-container">
      {/* Avatar Video */}
      {videoTrack && (
        <VideoTrack 
          trackRef={videoTrack} 
          style={{ 
            width: '100%', 
            maxWidth: '640px',
            borderRadius: '12px' 
          }} 
        />
      )}
      
      {/* Audio Visualizer */}
      {audioTrack && (
        <BarVisualizer 
          trackRef={audioTrack} 
          state={state}
          barCount={5}
          style={{ height: '50px', marginTop: '10px' }}
        />
      )}
      
      {/* Agent State */}
      <div className="agent-state">
        {state === 'listening' && '🎤 Listening...'}
        {state === 'thinking' && '🤔 Thinking...'}
        {state === 'speaking' && '🗣️ Speaking...'}
      </div>
    </div>
  );
}

// Main App Component
export default function AvatarChat({ agentId, avatarId }) {
  const [connectionDetails, setConnectionDetails] = useState(null);
  const [error, setError] = useState(null);

  // Start avatar session on mount
  useEffect(() => {
    async function startSession() {
      try {
        const response = await fetch('https://voice.zainlee.com/api/playground/start', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR_TOKEN',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: agentId,
            avatar: {
              enabled: true,
              avatar_id: avatarId,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to start session: ${response.statusText}`);
        }

        const data = await response.json();
        setConnectionDetails(data);
      } catch (err) {
        setError(err.message);
      }
    }

    startSession();
  }, [agentId, avatarId]);

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!connectionDetails) {
    return <div className="loading">Starting avatar session...</div>;
  }

  return (
    <LiveKitRoom
      serverUrl={connectionDetails.server_url}
      token={connectionDetails.token}
      connect={true}
      audio={true}
      video={false}
    >
      <AvatarAgent />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}

// Usage in your app:
// <AvatarChat 
//   agentId="your_agent_id" 
//   avatarId="b9be11b8-89fb-4227-8f86-4a881393cbdb" 
// />
```

**Vanilla JavaScript - Connect to Avatar Agent:**

```html
<!DOCTYPE html>
<html>
<head>
  <title>Avatar Voice Agent</title>
  <script src="https://cdn.jsdelivr.net/npm/livekit-client/dist/livekit-client.umd.min.js"></script>
  <style>
    #avatar-video { width: 640px; height: 480px; background: #000; border-radius: 12px; }
    #status { margin-top: 10px; font-family: sans-serif; }
  </style>
</head>
<body>
  <h1>Avatar Voice Agent</h1>
  <video id="avatar-video" autoplay playsinline></video>
  <div id="status">Connecting...</div>
  <button id="start-btn" onclick="startAvatarChat()">Start Chat</button>

  <script>
    async function startAvatarChat() {
      const statusEl = document.getElementById('status');
      const videoEl = document.getElementById('avatar-video');
      
      try {
        // 1. Start avatar session via API
        statusEl.textContent = 'Starting avatar session...';
        
        const response = await fetch('https://voice.zainlee.com/api/playground/start', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer YOUR_TOKEN',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            agent_id: 'your_agent_id',
            avatar: { enabled: true }
          }),
        });
        
        const { server_url, token, room: roomName } = await response.json();
        
        // 2. Connect to LiveKit room
        statusEl.textContent = 'Connecting to room...';
        
        const room = new LivekitClient.Room({
          adaptiveStream: true,
          dynacast: true,
        });
        
        // 3. Handle avatar video track
        room.on(LivekitClient.RoomEvent.TrackSubscribed, (track, publication, participant) => {
          if (track.kind === 'video') {
            // This is the avatar video
            track.attach(videoEl);
            statusEl.textContent = '🎥 Avatar connected!';
          }
          if (track.kind === 'audio') {
            // Play agent audio
            const audioEl = track.attach();
            document.body.appendChild(audioEl);
          }
        });
        
        // 4. Connect
        await room.connect(server_url, token);
        statusEl.textContent = `Connected to ${roomName}`;
        
        // 5. Enable microphone to talk to agent
        await room.localParticipant.setMicrophoneEnabled(true);
        statusEl.textContent = '🎤 Microphone enabled - Start talking!';
        
      } catch (err) {
        statusEl.textContent = '❌ Error: ' + err.message;
        console.error(err);
      }
    }
  </script>
</body>
</html>
```

---

### 2. Embed API (For Widget Integration)

Use this to create embeddable agent widgets for your website or application.

#### Step 1: Create an Embed Session

```bash
POST /api/embed/create
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "agent_id": "your_agent_id",
  "room": "optional-room-name",
  "title": "Customer Support Agent",
  "theme": "dark",
  "ttl_seconds": 900
}
```

**Response:**
```json
{
  "sid": "session_id_abc123",
  "room": "embed-xyz789",
  "iframe_url": "https://your-server.com/embed/widget?sid=session_id_abc123",
  "expires_at": 1234567890
}
```

#### Step 2: Embed in Your Application

**HTML Iframe:**
```html
<iframe 
  src="https://your-server.com/embed/widget?sid=session_id_abc123"
  width="400"
  height="600"
  frameborder="0"
  allow="microphone; camera">
</iframe>
```

**Or Use the Token Endpoint Directly:**

```bash
GET /api/embed/token/{sid}
```

This returns LiveKit connection credentials that your custom UI can use.

---

### 3. Twilio Integration (For Phone Calls)

Configure Twilio to route incoming calls to your voice agents.

#### Setup Steps

**A. Configure Your Twilio Account in the System:**

```bash
POST /api/twilio/accounts
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "account_sid": "ACxxxx",
  "auth_token": "your_twilio_auth_token",
  "label": "Production Account"
}
```

**B. Map Phone Numbers to Agents:**

```bash
PUT /api/twilio/numbers
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "numbers": {
    "+14155551234": {
      "account_id": "account_id_from_previous_step",
      "agent_id": "your_agent_id",
      "trunk": "Main Support Line"
    }
  }
}
```

**C. Configure Twilio Webhook:**

In your Twilio console, set the Voice webhook URL for your phone number to:

```
https://voice.zainlee.com/api/twilio/voice
```

Method: `POST`

#### How It Works

1. Customer calls your Twilio number
2. Twilio sends webhook to `/api/twilio/voice`
3. System looks up which agent is assigned to that number
4. Returns TwiML to bridge the call to LiveKit SIP trunk
5. Agent worker automatically spawns and handles the call

---

### 4. Direct LiveKit SIP Integration

For advanced integrations, connect directly to LiveKit SIP trunks.

#### Prerequisites

- LiveKit Cloud or self-hosted LiveKit server with SIP enabled
- SIP trunk configured in LiveKit
- Agent numbers registered in the system

#### Configuration

**A. Set Up Number Routing:**

```bash
PUT /api/numbers
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "routes": {
    "+14155551234": {
      "agent_id": "your_agent_id",
      "trunk": "LiveKit SIP Trunk"
    }
  }
}
```

**B. Environment Variables Required:**

```bash
LIVEKIT_URL=wss://your-livekit-server.com
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_SIP_DOMAIN=sip.your-livekit-server.com
LIVEKIT_WEBHOOK_KEY=your_webhook_key
LIVEKIT_WEBHOOK_SECRET=your_webhook_secret
```

**C. Configure LiveKit Webhook:**

Set your LiveKit webhook URL to:

```
https://voice.zainlee.com/api/webhooks/livekit
```

This receives call events and automatically spawns agents.

#### Making a SIP Call

Use any SIP client or service to call:

```
sip:+14155551234@sip.your-livekit-server.com
```

The system will automatically route to the correct agent based on the number mapping.

### 5. Scheduled Outbound Calls with Dynamic Context

Use this endpoint to schedule an outbound call (SIP) to a specific number, injecting dynamic context such as a questionnaire or candidate details.

#### Endpoint: `POST /api/outbound/schedule`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```

**Request Body:**
```json
{
  "agent_id": "hr_agent_id",
  "to_number": "+1234567890",
  "scheduled_at": "2025-12-15T15:30:00Z",
  "context": {
    "candidate_name": "John Doe",
    "questionnaire": [
      "1. Can you confirm your full name?",
      "2. Are you currently authorized to work in the UAE?",
      "3. When is your earliest available start date?",
      "4. What is your expected salary range?"
    ],
    "callback_url": "https://your-server.com/api/call-results",
    "interview_id": "int_abc123"
  }
}
```

> **Important:** The `interview_id` field is YOUR system's identifier for this interview/call. 
> It will be echoed back in the callback so you can match results to your database record.
```

**Response:**
```json
{
  "schedule_id": "sched_12345",
  "status": "scheduled",
  "scheduled_at": "2025-12-15T15:30:00Z"
}
```

**How It Works:**
1. The system schedules the call for the specified time (or immediately if `scheduled_at` is omitted/past).
2. When the call starts, the `candidate_name` and `questionnaire` are injected into the agent's system prompt.
3. The agent will greet the user and proceed to ask the mandatory questions defined in the questionnaire.
4. When the call ends, if a `callback_url` is provided, the system POSTs the questionnaire results to that URL.

---

### 6. Receiving Questionnaire Results via Callback

When you provide a `callback_url` in your outbound call request, the system will POST the call results to that URL when the call ends.

#### Callback Payload Structure

Your callback endpoint will receive a POST request with the following JSON body:

```json
{
  "call_id": "outbound-a3bcebbe7f474b128f4bac7df0e85c30-e150d58a",
  "interview_id": "int_abc123",
  "candidate_name": "John Doe",
  "phone_number": "+1234567890",
  "questionnaire_results": [
    {
      "question_index": 1,
      "question": "Can you confirm your full name?",
      "answer": "Yes, my name is John Doe."
    },
    {
      "question_index": 2,
      "question": "Are you currently authorized to work in the UAE?",
      "answer": "Yes, I have a valid work permit."
    },
    {
      "question_index": 3,
      "question": "When is your earliest available start date?",
      "answer": "I can start from January 15th."
    },
    {
      "question_index": 4,
      "question": "What is your expected salary range?",
      "answer": "I'm looking for 15,000 to 18,000 AED monthly."
    }
  ],
  "transcript": [
    {"role": "assistant", "text": "Hello, this is...", "timestamp": "..."},
    {"role": "user", "text": "Hi, yes speaking.", "timestamp": "..."}
  ],
  "call_duration_seconds": 180,
  "call_status": "completed",
  "timestamp": "2025-12-22T13:00:00.000Z"
}
```

> **Note:** The `interview_id` field is echoed back from your original request, allowing you to match the callback to your database record. Use this instead of `call_id` for lookups.

#### Callback Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `call_id` | string | Unique identifier for this call |
| `candidate_name` | string | The candidate's name (as provided in the request) |
| `phone_number` | string | The phone number that was called |
| `questionnaire_results` | array | Extracted Q&A pairs from the conversation |
| `transcript` | array | Full conversation transcript with role, text, and timestamp |
| `call_duration_seconds` | integer | Total call duration in seconds |
| `call_status` | string | One of: `completed`, `no_answer`, `failed` |
| `timestamp` | string | ISO 8601 timestamp when the callback was sent |

#### Example Callback Handler (Python/Flask)

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/call-results', methods=['POST'])
def handle_call_results():
    data = request.json
    
    call_id = data.get('call_id')
    candidate = data.get('candidate_name')
    results = data.get('questionnaire_results', [])
    
    print(f"Call {call_id} completed for {candidate}")
    
    # Process the questionnaire answers
    for qa in results:
        print(f"Q{qa['question_index']}: {qa['question']}")
        print(f"A: {qa['answer']}")
        print("---")
    
    # Store results in your database
    # ...
    
    return jsonify({"status": "received"}), 200
```

#### Example Callback Handler (Node.js/Express)

```javascript
const express = require('express');
const app = express();
app.use(express.json());

app.post('/api/call-results', (req, res) => {
    const { call_id, candidate_name, questionnaire_results, call_duration_seconds } = req.body;
    
    console.log(`Call ${call_id} completed for ${candidate_name}`);
    console.log(`Duration: ${call_duration_seconds} seconds`);
    
    // Process answers
    questionnaire_results.forEach(qa => {
        console.log(`Q${qa.question_index}: ${qa.question}`);
        console.log(`A: ${qa.answer}`);
    });
    
    // Store in database, trigger next workflow step, etc.
    
    res.json({ status: 'received' });
});

app.listen(3000);
```

#### Immediate Outbound Call with Callback

For immediate calls (not scheduled), use `/api/outbound/call`:

```bash
POST /api/outbound/call
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "agent_id": "hr_agent_id",
  "to_number": "+1234567890",
  "from_number": "+12568713652",
  "callback_url": "https://your-server.com/api/call-results",
  "context": {
    "candidate_name": "John Doe",
    "interview_id": "int_abc123",
    "questionnaire": [
      "What is your current notice period?",
      "Are you open to relocation?"
    ]
  }
}
```

---

## Number Routing Configuration

The system uses a flexible number-to-agent routing system.

### View Current Routes

```bash
GET /api/numbers
```

**Response:**
```json
{
  "routes": {
    "+14155551234": {
      "agent_id": "agent_abc123",
      "trunk": "Main Support"
    },
    "+14155555678": {
      "agent_id": "agent_xyz789",
      "trunk": "Sales Line"
    }
  },
  "selected_number": "+14155551234"
}
```

### Update Routes

```bash
PUT /api/numbers
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "routes": {
    "+14155551234": {
      "agent_id": "agent_abc123",
      "trunk": "Customer Support"
    }
  },
  "selected_number": "+14155551234"
}
```

### Delete a Route

```bash
DELETE /api/numbers/+14155551234
Authorization: Bearer YOUR_TOKEN
```

---

## Complete Examples

### Example 1: Python - Start a Voice Session

```python
import requests
import json

# Configuration
BASE_URL = "https://voice.zainlee.com"
API_TOKEN = "your_auth_token"

# Headers
headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

# Start a playground session
response = requests.post(
    f"{BASE_URL}/api/playground/start",
    headers=headers,
    json={
        "agent_id": "your_agent_id",
        "room": "my-support-call-001",
        "tools": [
            {
                "name": "lookup_order",
                "description": "Look up customer order information",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {
                            "type": "string",
                            "description": "Order ID"
                        }
                    },
                    "required": ["order_id"]
                },
                "implementation": {
                    "type": "http_callback",
                    "url": "https://api.example.com/orders",
                    "method": "GET",
                    "headers": {
                        "X-API-Key": "your_api_key"
                    },
                    "timeout": 5
                }
            }
        ]
    }
)

if response.status_code == 200:
    data = response.json()
    print(f"Room created: {data['room']}")
    print(f"Server URL: {data['server_url']}")
    print(f"Token: {data['token']}")
    print(f"Identity: {data['identity']}")
    
    # Now use LiveKit client SDK to connect
    # Example using livekit-python:
    # from livekit import rtc
    # room = rtc.Room()
    # await room.connect(data['server_url'], data['token'])
else:
    print(f"Error: {response.status_code}")
    print(response.text)
```

### Example 2: Node.js - Create Embeddable Widget

```javascript
const axios = require('axios');

const BASE_URL = 'https://voice.zainlee.com';
const API_TOKEN = 'your_auth_token';

async function createEmbedSession(agentId, options = {}) {
  try {
    const response = await axios.post(
      `${BASE_URL}/api/embed/create`,
      {
        agent_id: agentId,
        room: options.room || undefined,
        title: options.title || 'Voice Agent',
        theme: options.theme || 'light',
        ttl_seconds: options.ttl || 900
      },
      {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error creating embed session:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
createEmbedSession('your_agent_id', {
  title: 'Customer Support',
  theme: 'dark',
  ttl: 1800 // 30 minutes
}).then(session => {
  console.log('Embed URL:', session.iframe_url);
  console.log('Session ID:', session.sid);
  console.log('Expires at:', new Date(session.expires_at * 1000));
});
```

### Example 3: cURL - Configure Twilio Integration

```bash
#!/bin/bash

BASE_URL="https://voice.zainlee.com"
API_TOKEN="your_auth_token"

# Step 1: Add Twilio Account
curl -X POST "${BASE_URL}/api/twilio/accounts" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "account_sid": "ACxxxxxxxxxxxx",
    "auth_token": "your_twilio_auth_token",
    "label": "Production Twilio"
  }'

# Step 2: Map Phone Number to Agent
# (Use account_id from previous response)
curl -X PUT "${BASE_URL}/api/twilio/numbers" \
  -H "Authorization: Bearer ${API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "numbers": {
      "+14155551234": {
        "account_id": "account_id_from_step1",
        "agent_id": "your_agent_id",
        "trunk": "Support Line"
      }
    }
  }'

# Step 3: List all configured numbers
curl -X GET "${BASE_URL}/api/twilio/numbers" \
  -H "Authorization: Bearer ${API_TOKEN}"
```

### Example 4: JavaScript - Connect Browser Client

```javascript
// After receiving credentials from /playground/start
import { Room, RoomEvent } from 'livekit-client';

async function connectToAgent(serverUrl, token) {
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    audioCaptureDefaults: {
      autoGainControl: true,
      echoCancellation: true,
      noiseSuppression: true
    }
  });

  // Set up event listeners
  room.on(RoomEvent.Connected, () => {
    console.log('Connected to voice agent');
  });

  room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
    if (track.kind === 'audio') {
      const audioElement = track.attach();
      document.body.appendChild(audioElement);
      console.log('Agent audio track received');
    }
  });

  room.on(RoomEvent.Disconnected, () => {
    console.log('Disconnected from agent');
  });

  // Connect to the room
  await room.connect(serverUrl, token);

  // Enable microphone
  await room.localParticipant.setMicrophoneEnabled(true);

  return room;
}

// Usage with playground API
async function startAgentSession(agentId) {
  const response = await fetch('https://voice.zainlee.com/api/playground/start', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      agent_id: agentId
    })
  });

  const credentials = await response.json();
  const room = await connectToAgent(credentials.server_url, credentials.token);
  
  return {
    room,
    roomName: credentials.room
  };
}
```

### Example 5: Python - Schedule HR Interview Call

```python
import requests
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "https://voice.zainlee.com"
API_TOKEN = "your_auth_token"

def schedule_interview(candidate_phone, candidate_name, questions):
    # Schedule for 1 minute from now
    schedule_time = (datetime.utcnow() + timedelta(minutes=1)).isoformat() + "Z"
    
    payload = {
        "agent_id": "hr_recruiter_agent",
        "to_number": candidate_phone,
        "scheduled_at": schedule_time,
        "context": {
            "candidate_name": candidate_name,
            "questionnaire": questions
        }
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/outbound/schedule",
            headers={
                "Authorization": f"Bearer {API_TOKEN}",
                "Content-Type": "application/json"
            },
            json=payload
        )
        response.raise_for_status()
        print(f"Interview scheduled: {response.json()}")
    except Exception as e:
        print(f"Failed to schedule interview: {e}")

# Usage
questions = [
    "Could you briefly describe your experience with Python?",
    "Have you worked with real-time audio processing before?",
    "What is your notice period?"
]

schedule_interview("+15550001234", "Alice Smith", questions)
```

### Example 6: Full Avatar Integration - Python Backend + React Frontend

This complete example shows how to build an avatar-enabled voice agent chat from scratch.

**Backend (Python/Flask) - Session Manager:**

```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)

VOICE_API_URL = "https://voice.zainlee.com"
VOICE_API_TOKEN = os.getenv("VOICE_API_TOKEN")

@app.route('/api/start-avatar-chat', methods=['POST'])
def start_avatar_chat():
    """Create an avatar voice agent session for a user."""
    data = request.json
    agent_id = data.get('agent_id', 'default_agent')
    avatar_id = data.get('avatar_id')  # Optional custom avatar
    
    # Start session with avatar enabled
    response = requests.post(
        f"{VOICE_API_URL}/api/playground/start",
        headers={
            "Authorization": f"Bearer {VOICE_API_TOKEN}",
            "Content-Type": "application/json"
        },
        json={
            "agent_id": agent_id,
            "avatar": {
                "enabled": True,
                "avatar_id": avatar_id
            }
        }
    )
    
    if response.status_code == 200:
        session_data = response.json()
        return jsonify({
            "success": True,
            "serverUrl": session_data["server_url"],
            "token": session_data["token"],
            "room": session_data["room"],
            "avatar": session_data.get("avatar")
        })
    else:
        return jsonify({
            "success": False,
            "error": response.text
        }), response.status_code

@app.route('/api/end-avatar-chat', methods=['POST'])
def end_avatar_chat():
    """End an avatar voice agent session."""
    data = request.json
    room = data.get('room')
    
    response = requests.post(
        f"{VOICE_API_URL}/api/playground/stop",
        headers={
            "Authorization": f"Bearer {VOICE_API_TOKEN}",
            "Content-Type": "application/json"
        },
        json={"room": room}
    )
    
    return jsonify({"success": response.status_code == 200})

if __name__ == '__main__':
    app.run(port=3001)
```

**Frontend (React) - Complete Avatar Chat App:**

```jsx
// AvatarChatApp.jsx
import React, { useState, useCallback } from 'react';
import {
  LiveKitRoom,
  VideoTrack,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  useConnectionState,
  ConnectionState,
} from '@livekit/components-react';
import '@livekit/components-styles';

// Avatar Display Component
function AvatarDisplay() {
  const { state, audioTrack, videoTrack } = useVoiceAssistant();
  const connectionState = useConnectionState();

  if (connectionState !== ConnectionState.Connected) {
    return <div className="connecting">Connecting to avatar...</div>;
  }

  return (
    <div className="avatar-display">
      {/* Avatar Video Feed */}
      <div className="video-container">
        {videoTrack ? (
          <VideoTrack 
            trackRef={videoTrack} 
            className="avatar-video"
          />
        ) : (
          <div className="video-placeholder">
            <span>Waiting for avatar...</span>
          </div>
        )}
      </div>

      {/* Audio Visualizer */}
      <div className="visualizer-container">
        {audioTrack && (
          <BarVisualizer 
            trackRef={audioTrack} 
            state={state}
            barCount={7}
            className="audio-visualizer"
          />
        )}
      </div>

      {/* Status Indicator */}
      <div className={`status-indicator ${state}`}>
        {state === 'listening' && '🎤 Listening...'}
        {state === 'thinking' && '🤔 Processing...'}
        {state === 'speaking' && '🗣️ Speaking...'}
        {state === 'idle' && '💤 Ready'}
      </div>
    </div>
  );
}

// Main Chat App
export default function AvatarChatApp({ agentId, avatarId }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startChat = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/start-avatar-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agentId, avatar_id: avatarId }),
      });

      const data = await response.json();

      if (data.success) {
        setSession(data);
      } else {
        setError(data.error || 'Failed to start session');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agentId, avatarId]);

  const endChat = useCallback(async () => {
    if (session?.room) {
      await fetch('/api/end-avatar-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room: session.room }),
      });
    }
    setSession(null);
  }, [session]);

  // Not connected yet
  if (!session) {
    return (
      <div className="chat-launcher">
        <h2>Talk to Our AI Avatar</h2>
        <p>Click below to start a voice conversation with our AI assistant.</p>
        
        {error && <div className="error-message">{error}</div>}
        
        <button 
          onClick={startChat} 
          disabled={loading}
          className="start-button"
        >
          {loading ? 'Starting...' : '🎥 Start Avatar Chat'}
        </button>
      </div>
    );
  }

  // Connected - show avatar
  return (
    <div className="avatar-chat">
      <LiveKitRoom
        serverUrl={session.serverUrl}
        token={session.token}
        connect={true}
        audio={true}
        video={false}
        onDisconnected={endChat}
      >
        <AvatarDisplay />
        <RoomAudioRenderer />
        
        <button onClick={endChat} className="end-button">
          End Chat
        </button>
      </LiveKitRoom>
    </div>
  );
}
```

**CSS Styles:**

```css
/* avatar-chat.css */
.avatar-chat {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.avatar-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.video-container {
  width: 100%;
  max-width: 640px;
  aspect-ratio: 16/9;
  background: #1a1a2e;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.avatar-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 18px;
}

.audio-visualizer {
  height: 60px;
  width: 200px;
}

.status-indicator {
  padding: 10px 20px;
  border-radius: 20px;
  font-size: 16px;
  font-weight: 500;
}

.status-indicator.listening { background: #4CAF50; color: white; }
.status-indicator.thinking { background: #FF9800; color: white; }
.status-indicator.speaking { background: #2196F3; color: white; }
.status-indicator.idle { background: #9E9E9E; color: white; }

.start-button, .end-button {
  padding: 15px 30px;
  font-size: 18px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.start-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.start-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.end-button {
  background: #f44336;
  color: white;
  margin-top: 20px;
}

.error-message {
  color: #f44336;
  padding: 10px;
  margin: 10px 0;
  background: #ffebee;
  border-radius: 4px;
}
```

**Usage:**

```jsx
// In your app
import AvatarChatApp from './AvatarChatApp';

function App() {
  return (
    <AvatarChatApp 
      agentId="your_customer_support_agent"
      avatarId="b9be11b8-89fb-4227-8f86-4a881393cbdb"
    />
  );
}
```

---

## Advanced Features

### Custom Tools Integration

The agent can call back to your APIs during conversations. Define tools in the `/api/playground/start` request:

```json
{
  "agent_id": "your_agent_id",
  "tools": [
    {
      "name": "check_inventory",
      "description": "Check if a product is in stock",
      "parameters": {
        "type": "object",
        "properties": {
          "product_id": {"type": "string"},
          "quantity": {"type": "number"}
        },
        "required": ["product_id"]
      },
      "implementation": {
        "type": "http_callback",
        "url": "https://api.yourcompany.com/inventory/check",
        "method": "POST",
        "headers": {
          "X-API-Key": "your_api_key",
          "Content-Type": "application/json"
        },
        "timeout": 10
      }
    }
  ]
}
```

When the agent calls this tool, your API will receive:

```json
{
  "tool": "check_inventory",
  "arguments": {
    "product_id": "ABC123",
    "quantity": 5
  }
}
```

Return JSON response:

```json
{
  "in_stock": true,
  "quantity_available": 50,
  "warehouse_location": "Building A"
}
```

### Global Tools Webhook

Instead of defining implementation for each tool, use a global webhook:

```json
{
  "agent_id": "your_agent_id",
  "tools_webhook": {
    "url": "https://api.yourcompany.com/tools",
    "method": "POST",
    "headers": {
      "Authorization": "Bearer YOUR_KEY"
    },
    "timeout": 10
  },
  "tools": [
    {
      "name": "get_account_balance",
      "description": "Get customer account balance",
      "parameters": {
        "type": "object",
        "properties": {
          "account_id": {"type": "string"}
        }
      }
    }
  ]
}
```

### Monitoring Active Calls

```bash
GET /api/livekit/calls
Authorization: Bearer YOUR_TOKEN
```

Returns list of active and recent calls with metadata.

### Retrieving Call Transcripts

```bash
# List all transcripts
GET /api/transcripts

# Get specific transcript by room name
GET /api/transcripts/by_room/{room_name}
```

---

## Environment Variables Reference

### Core Configuration

```bash
# Config API Server
CONFIG_API_PORT=5057                    # Port for config API (default: 5057)
CONFIG_API_BASE=https://voice.zainlee.com/api # Public Base URL for callbacks

# Internal API Security (REQUIRED for agent-to-config-api communication)
INTERNAL_API_KEY=your_internal_secret   # Secret key for internal endpoints
```

### LiveKit Configuration (REQUIRED)

```bash
# LiveKit Server
LIVEKIT_URL=wss://your-livekit-server.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# LiveKit SIP Configuration (for phone call integration)
LIVEKIT_SIP_URI=your-subdomain.sip.livekit.cloud
LIVEKIT_SIP_USERNAME=admin              # SIP trunk username
LIVEKIT_SIP_PASSWORD=your_sip_password  # SIP trunk password
LIVEKIT_SIP_DOMAIN=your-subdomain.sip.livekit.cloud  # Alternative format

# LiveKit Webhooks (for signature validation)
LIVEKIT_WEBHOOK_KEY=your_webhook_key
LIVEKIT_WEBHOOK_SECRET=your_webhook_secret
```

### OpenAI Configuration

```bash
# OpenAI API (for LLM and optional TTS)
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=https://api.openai.com  # Optional, for custom endpoints
OPENAI_MODEL=gpt-4o-mini                # Default LLM model
```

### Fish Audio TTS Configuration (Primary TTS Provider)

```bash
# Fish Audio API (REQUIRED for TTS)
FISH_AUDIO_API_KEY=your_fish_audio_key
DEFAULT_VOICE=your_voice_id             # Fish Audio voice reference ID

# Optional Fish Audio Settings
FISH_AUDIO_MODEL=s1                     # Model version (default: s1)
FISH_AUDIO_VOLUME_DB=12.0               # Volume adjustment in dB
FISH_AUDIO_SPEED=1.1                    # Speech speed multiplier
FISH_AUDIO_TEMPERATURE=0.7              # Sampling temperature
FISH_AUDIO_TOP_P=0.7                    # Nucleus sampling
FISH_AUDIO_LATENCY=low                  # Latency mode: low/balanced/high
FISH_AUDIO_RESPONSE_FORMAT=opus         # Format: opus/mp3/wav/aac/flac
```

### Twilio Configuration (for Phone Integration)

```bash
# Twilio Account Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx       # Your Twilio Account SID
TWILIO_AUTH_TOKEN=your_auth_token       # Auth token for webhook validation
TWILIO_PHONE_NUMBER=+15551234567        # Your Twilio phone number
```

### Alternative TTS/STT Providers (Optional)

```bash
# Local TTS Server (if not using Fish Audio or OpenAI)
TTS_SERVER_URL=http://localhost:5000

# Local STT Server (if not using OpenAI Whisper)
STT_SERVER_URL=ws://localhost:8080/ws
```

### Ollama Configuration (for Local LLM)

```bash
# Ollama Local LLM (alternative to OpenAI)
OLLAMA_MODEL=gemma3n:e2b                # Ollama model name
OLLAMA_BASE_URL=http://localhost:11434/v1  # Ollama API endpoint
```

### PBX Recordings Integration (Optional)

```bash
# FreePBX/PBX Recordings API
RECORDINGS_API_BASE=http://your-pbx-server:8080
RECORDINGS_API_KEY=your_recordings_api_key

# Recordings Indexer Settings
RECORDINGS_INDEX_POLL_SECONDS=15        # Index refresh interval
RECORDINGS_INDEX_PAGES_PER_CYCLE=3      # Pages to fetch per cycle
RECORDINGS_INDEX_PAGE_SIZE=500          # Items per page
RECORDINGS_DEBUG=1                      # Enable recordings debug logs
```

### Knowledge Base MCP Integration (Optional)

```bash
# Knowledge Base MCP Server
KB_MCP_URL=http://127.0.0.1:8055/mcp    # KB MCP server endpoint
KB_AUTH_TOKEN=your_kb_auth_token        # Authentication token for KB server
```

### Feature Flags

```bash
# Agent Spawning Behavior
WEBHOOK_AUTOSPAWN=1                     # Auto-spawn agents on SIP calls (1=enabled)
ENABLE_CLOUD_DISPATCH=1                 # Use LiveKit Cloud dispatch (1=enabled)
ENABLE_LOCAL_SUPERVISOR=0               # Run local worker supervisor (1=enabled)

# Embed Widget Settings
EMBED_TTL_SECONDS=900                   # Default embed session timeout (seconds)
EMBED_ALLOWED_ORIGINS=https://yoursite.com,https://app.yoursite.com  # CORS whitelist (comma-separated)

# API Configuration
API_PREFIX=/api                         # API route prefix (default: /api)
PUBLIC_BASE_URL=https://your-domain.com # Public URL for iframe/embed generation
```

### Advanced Settings

```bash
# Protocol Buffers
PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python  # Use pure Python implementation

# Runtime Configuration (for agents)
AGENT_NAME=+14155551234                 # Agent identifier (usually phone number)
AGENT_PHONE_NUMBER=+14155551234         # Agent's phone number
DIALED_NUMBER=+14155551234              # Number that was dialed
AGENT_PROFILE_ID=your_agent_id          # Agent configuration ID

# Environment Silence (reduce log noise)
LIBVA_MESSAGING_LEVEL=0                 # Suppress VAAPI messages
FFMPEG_LOG_LEVEL=error                  # FFmpeg log level
GLOG_minloglevel=2                      # Google logging level
TF_CPP_MIN_LOG_LEVEL=3                  # TensorFlow logging
CUDA_VISIBLE_DEVICES=                   # Disable GPU (empty = CPU only)
PYTHONUNBUFFERED=1                      # Unbuffered Python output
```

### Complete .env Example

Here's a complete `.env` file template:

```bash
# ============================================================================
# Zainlee Voice Agent - Environment Configuration
# ============================================================================

# ---------- Core Configuration ----------
CONFIG_API_PORT=5057
INTERNAL_API_KEY=your_secure_internal_secret

# ---------- LiveKit (REQUIRED) ----------
LIVEKIT_URL=wss://your-subdomain.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# LiveKit SIP (for phone calls)
LIVEKIT_SIP_URI=your-subdomain.sip.livekit.cloud
LIVEKIT_SIP_USERNAME=admin
LIVEKIT_SIP_PASSWORD=your_sip_password

# LiveKit Webhooks
LIVEKIT_WEBHOOK_KEY=your_webhook_key
LIVEKIT_WEBHOOK_SECRET=your_webhook_secret

# ---------- Fish Audio TTS (Primary) ----------
FISH_AUDIO_API_KEY=your_fish_audio_api_key
DEFAULT_VOICE=your_fish_voice_id
FISH_AUDIO_MODEL=s1
FISH_AUDIO_VOLUME_DB=12.0
FISH_AUDIO_SPEED=1.1

# ---------- OpenAI ----------
OPENAI_API_KEY=your_openai_api_key
# OPENAI_BASE_URL=https://api.openai.com  # Optional

# ---------- Twilio (for Phone Integration) ----------
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+15551234567

# ---------- Optional: Local Services ----------
# TTS_SERVER_URL=http://localhost:5000
# STT_SERVER_URL=ws://localhost:8080/ws

# ---------- Optional: Ollama (Local LLM) ----------
# OLLAMA_MODEL=gemma3n:e2b
# OLLAMA_BASE_URL=http://localhost:11434/v1

# ---------- Optional: PBX Recordings ----------
# RECORDINGS_API_BASE=http://your-pbx:8080
# RECORDINGS_API_KEY=your_recordings_key
# RECORDINGS_DEBUG=1

# ---------- Optional: Knowledge Base ----------
# KB_MCP_URL=http://127.0.0.1:8055/mcp
# KB_AUTH_TOKEN=your_kb_token

# ---------- Feature Flags ----------
WEBHOOK_AUTOSPAWN=1
ENABLE_CLOUD_DISPATCH=1
ENABLE_LOCAL_SUPERVISOR=0

# ---------- Embed Widget ----------
EMBED_TTL_SECONDS=900
# EMBED_ALLOWED_ORIGINS=https://yoursite.com

# ---------- Advanced ----------
PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python
```

---

## Troubleshooting

### Issue: "missing_livekit_env" error

**Solution:** Ensure `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are set in your environment or configured in the defaults via `PUT /defaults`.

### Issue: Agent doesn't spawn on call

**Check:**
1. `WEBHOOK_AUTOSPAWN=1` is set
2. Number routing is configured (`/numbers` endpoint)
3. Webhook endpoint is accessible from LiveKit/Twilio
4. Check logs in `logs/` directory

### Issue: Unauthorized (401) errors

**Solution:** Obtain a fresh token via `/auth/login` and include it in `Authorization: Bearer TOKEN` header.

### Issue: Tools not executing

**Check:**
1. Tools were included in `/playground/start` request
2. Tool implementation URL is accessible from the server
3. Tool webhook returns valid JSON
4. Check agent logs: `logs/play_*.log`

---

## Security Best Practices

1. **Never expose your API token** in client-side code
2. **Use HTTPS** for all webhook URLs
3. **Validate webhook signatures** (Twilio, LiveKit)
4. **Set appropriate EMBED_ALLOWED_ORIGINS** for embed widgets
5. **Use INTERNAL_API_KEY** for agent-to-config-api communication
6. **Rotate tokens** and credentials regularly
7. **Implement rate limiting** on your webhook endpoints

---

## Support & Resources

- **LiveKit Documentation**: https://docs.livekit.io/
- **LiveKit Client SDKs**: https://docs.livekit.io/realtime/client/
- **Twilio Voice API**: https://www.twilio.com/docs/voice
- **OpenAI API**: https://platform.openai.com/docs/

---

## Quick Start Checklist

- [ ] Install and configure the config API server
- [ ] Set up LiveKit server (Cloud or self-hosted)
- [ ] Configure environment variables
- [ ] Register a user account (`/api/auth/register`)
- [ ] Create an agent profile (via web UI or API)
- [ ] Test with Playground API (`/api/playground/start`)
- [ ] Configure number routing if using phone integration
- [ ] Set up webhooks for Twilio/LiveKit
- [ ] Implement tool callbacks (optional)
- [ ] Deploy to production with HTTPS

---

*Last Updated: 2025-12-29*

