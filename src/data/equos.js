// Gemini voice samples from Google AI Studio
export const voiceSamples = {
  Puck: 'https://storage.googleapis.com/generativeai-downloads/data/live_api_voice_samples/Puck.wav',
  Charon: 'https://storage.googleapis.com/generativeai-downloads/data/live_api_voice_samples/Charon.wav',
  Kore: 'https://storage.googleapis.com/generativeai-downloads/data/live_api_voice_samples/Kore.wav',
  Fenrir: 'https://storage.googleapis.com/generativeai-downloads/data/live_api_voice_samples/Fenrir.wav',
  Aoede: 'https://storage.googleapis.com/generativeai-downloads/data/live_api_voice_samples/Aoede.wav',
  Leda: 'https://storage.googleapis.com/generativeai-downloads/data/live_api_voice_samples/Leda.wav',
  Orus: 'https://storage.googleapis.com/generativeai-downloads/data/live_api_voice_samples/Orus.wav',
  Zephyr: 'https://storage.googleapis.com/generativeai-downloads/data/live_api_voice_samples/Zephyr.wav'
}

export const providers = [
  {
    id: 'gemini',
    name: 'Gemini',
    description: 'Multimodal AI by Google (Recommended)',
    models: ['gemini-2.5-flash-native-audio-preview-09-2025'],
    voices: [
      { id: 'Puck', name: 'Puck', gender: 'Male', accent: 'British' },
      { id: 'Charon', name: 'Charon', gender: 'Male', accent: 'American' },
      { id: 'Kore', name: 'Kore', gender: 'Female', accent: 'Australian' },
      { id: 'Fenrir', name: 'Fenrir', gender: 'Male', accent: 'American' },
      { id: 'Aoede', name: 'Aoede', gender: 'Female', accent: 'American' },
      { id: 'Leda', name: 'Leda', gender: 'Female', accent: 'British' },
      { id: 'Orus', name: 'Orus', gender: 'Male', accent: 'American' },
      { id: 'Zephyr', name: 'Zephyr', gender: 'Female', accent: 'American' }
    ]
  }
]

export const getVoicesByProvider = (providerId) => {
  const provider = providers.find(p => p.id === providerId)
  return provider ? provider.voices : []
}

export const getModelsByProvider = (providerId) => {
  const provider = providers.find(p => p.id === providerId)
  if (!provider) return []
  return provider.models.map(id => ({ id, name: id }))
}

export const agentFeatures = [
  { id: 'vision', name: 'Vision', description: 'Allow the avatar to see you through your camera and respond to what it sees.' },
  { id: 'search', name: 'Web Search', description: 'Allow the agent to search the web for real-time information.' },
  { id: 'emotions', name: 'Emotions', description: 'Enable emotional expression in voice and avatar.' },
  { id: 'memory', name: 'Memory', description: 'Remember context from previous conversations.' }
]

export const agentDefaults = {
  provider: 'gemini',
  model: 'gemini-2.5-flash-native-audio-preview-09-2025',
  voice: 'Puck'
}

export const generateAvatarIdentity = (name) => {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return `avatar-${slug}-${Date.now().toString(36)}`
}
