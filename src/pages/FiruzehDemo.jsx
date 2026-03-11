import { useState, useCallback, useEffect, useRef } from 'react'
import {
  LiveKitRoom,
  VideoTrack,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  useConnectionState,
  useTracks,
  useLocalParticipant,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import '@livekit/components-styles'

const DEMO_API = '/api/demo'

function getDemoToken() {
  return sessionStorage.getItem('firuzeh_demo_token')
}

function demoFetch(endpoint, options = {}) {
  const token = getDemoToken()
  return fetch(`${DEMO_API}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })
}

// =============================================
// PASSWORD GATE
// =============================================
function PasswordGate({ onAuthenticated }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${DEMO_API}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid password')
        return
      }
      sessionStorage.setItem('firuzeh_demo_token', data.token)
      onAuthenticated()
    } catch {
      setError('Connection failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Playfair Display', Georgia, serif",
    }}>
      <div style={{
        background: 'rgba(20, 20, 20, 0.95)',
        border: '1px solid rgba(212, 175, 55, 0.3)',
        borderRadius: '16px',
        padding: '48px 40px',
        maxWidth: '420px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏛️</div>
        <h1 style={{
          color: '#d4af37',
          fontSize: '32px',
          fontWeight: '700',
          margin: '0 0 8px',
          letterSpacing: '2px',
        }}>FIRUZEH</h1>
        <p style={{
          color: '#999',
          fontSize: '13px',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          margin: '0 0 32px',
          fontFamily: "'Inter', sans-serif",
        }}>Fine Iranian Dining</p>
        <p style={{
          color: '#bbb',
          fontSize: '14px',
          margin: '0 0 24px',
          fontFamily: "'Inter', sans-serif",
          lineHeight: '1.6',
        }}>
          This is a private demo. Please enter the access password to continue.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            style={{
              width: '100%',
              padding: '14px 16px',
              fontSize: '15px',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: '8px',
              background: 'rgba(0,0,0,0.4)',
              color: '#fff',
              outline: 'none',
              marginBottom: '16px',
              fontFamily: "'Inter', sans-serif",
              boxSizing: 'border-box',
              transition: 'border-color 0.3s',
            }}
            onFocus={(e) => e.target.style.borderColor = 'rgba(212, 175, 55, 0.7)'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(212, 175, 55, 0.3)'}
            autoFocus
          />
          {error && (
            <p style={{
              color: '#ef4444',
              fontSize: '13px',
              margin: '0 0 12px',
              fontFamily: "'Inter', sans-serif",
            }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '600',
              border: 'none',
              borderRadius: '8px',
              background: loading ? '#666' : 'linear-gradient(135deg, #d4af37, #b8962e)',
              color: '#000',
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: "'Inter', sans-serif",
              letterSpacing: '1px',
              transition: 'opacity 0.3s',
              opacity: !password ? 0.5 : 1,
            }}
          >
            {loading ? 'Verifying...' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}

// =============================================
// AVATAR WIDGET (Floating)
// =============================================
function AvatarVideoInner({ onClose }) {
  const { state, audioTrack } = useVoiceAssistant()
  const connectionState = useConnectionState()
  const subscribedTracks = useTracks(
    [Track.Source.Camera],
    { onlySubscribed: true }
  )

  const avatarVideoTrack = subscribedTracks.find(track => {
    if (!track?.participant?.identity) return false
    if (track.participant.identity.startsWith('demo-')) return false
    if (track.participant.identity.startsWith('user-')) return false
    return track.source === Track.Source.Camera
  })

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
    }}>
      <div style={{
        flex: 1,
        position: 'relative',
        background: '#000',
        borderRadius: '12px 12px 0 0',
        overflow: 'hidden',
        minHeight: '280px',
      }}>
        {avatarVideoTrack ? (
          <VideoTrack
            trackRef={avatarVideoTrack}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #d4af37',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }} />
            <span style={{ color: '#999', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
              {connectionState === 'connecting' ? 'Connecting...' : 'Loading Farzad...'}
            </span>
          </div>
        )}
        {avatarVideoTrack && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 12px 6px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)',
            textAlign: 'center',
          }}>
            <span style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.6)',
              fontFamily: "'Inter', sans-serif",
            }}>
              Tip: Mute your mic when done speaking for a smoother experience
            </span>
          </div>
        )}
      </div>

      <div style={{
        padding: '8px 16px',
        background: 'rgba(20, 20, 20, 0.98)',
        borderTop: '1px solid rgba(212, 175, 55, 0.2)',
      }}>
        {audioTrack && (
          <div style={{ marginBottom: '6px', height: '32px' }}>
            <BarVisualizer
              trackRef={audioTrack}
              state={state}
              barCount={5}
              style={{ height: '32px' }}
            />
          </div>
        )}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
            padding: '4px 10px',
            borderRadius: '12px',
            background:
              state === 'listening' ? 'rgba(34, 197, 94, 0.15)' :
              state === 'thinking' ? 'rgba(245, 158, 11, 0.15)' :
              state === 'speaking' ? 'rgba(59, 130, 246, 0.15)' :
              'rgba(100, 100, 100, 0.15)',
            color:
              state === 'listening' ? '#22c55e' :
              state === 'thinking' ? '#f59e0b' :
              state === 'speaking' ? '#3b82f6' :
              '#999',
          }}>
            {state === 'listening' ? '🎙️ Listening...' :
             state === 'thinking' ? '🤔 Thinking...' :
             state === 'speaking' ? '💬 Speaking...' :
             '✨ Ready'}
          </span>
          <MicToggle />
        </div>
      </div>
    </div>
  )
}

function MicToggle() {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant()

  const toggle = useCallback(async () => {
    if (!localParticipant) return
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
    } catch (err) {
      console.error('Mic toggle failed:', err)
    }
  }, [localParticipant, isMicrophoneEnabled])

  return (
    <button
      onClick={toggle}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: 'none',
        background: isMicrophoneEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
        color: isMicrophoneEnabled ? '#22c55e' : '#ef4444',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px',
        transition: 'all 0.2s',
      }}
      title={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
    >
      {isMicrophoneEnabled ? '🎙️' : '🔇'}
    </button>
  )
}

function AvatarWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const sessionRef = useRef(null)

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    return () => {
      const s = sessionRef.current
      if (s?.sessionId) {
        demoFetch(`/session/${s.sessionId}/stop`, { method: 'POST' }).catch(() => {})
      }
    }
  }, [])

  const startSession = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await demoFetch('/session', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start session')
      }
      setSession(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const endSession = useCallback(async () => {
    if (session?.sessionId) {
      try {
        await demoFetch(`/session/${session.sessionId}/stop`, { method: 'POST' })
      } catch {}
    }
    setSession(null)
  }, [session])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
    if (!session && !loading) {
      startSession()
    }
  }, [session, loading, startSession])

  const handleClose = useCallback(() => {
    endSession()
    setIsOpen(false)
    setError(null)
  }, [endSession])

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        @keyframes floatBadge { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
      `}</style>

      {!isOpen && (
        <button
          onClick={handleOpen}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            border: '2px solid #d4af37',
            background: 'linear-gradient(135deg, #1a1a2e, #0a0a0a)',
            cursor: 'pointer',
            boxShadow: '0 8px 32px rgba(212, 175, 55, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            zIndex: 9999,
            transition: 'transform 0.2s, box-shadow 0.2s',
            animation: 'pulse 3s ease-in-out infinite',
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)'
            e.target.style.boxShadow = '0 12px 40px rgba(212, 175, 55, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)'
            e.target.style.boxShadow = '0 8px 32px rgba(212, 175, 55, 0.3)'
          }}
          title="Talk to Farzad - Your Virtual Host"
        >
          👨‍💼
        </button>
      )}

      {!isOpen && (
        <div
          onClick={handleOpen}
          style={{
            position: 'fixed',
            bottom: '100px',
            right: '20px',
            background: 'rgba(212, 175, 55, 0.95)',
            color: '#000',
            padding: '8px 16px',
            borderRadius: '20px 20px 4px 20px',
            fontSize: '13px',
            fontWeight: '600',
            fontFamily: "'Inter', sans-serif",
            zIndex: 9999,
            cursor: 'pointer',
            animation: 'floatBadge 3s ease-in-out infinite',
            boxShadow: '0 4px 16px rgba(212, 175, 55, 0.3)',
            maxWidth: '200px',
          }}
        >
          Hi! I'm Farzad, your virtual host. Ask me anything!
        </div>
      )}

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '380px',
          maxHeight: '520px',
          background: 'rgba(15, 15, 15, 0.98)',
          border: '1px solid rgba(212, 175, 55, 0.3)',
          borderRadius: '16px',
          overflow: 'hidden',
          zIndex: 10000,
          animation: 'fadeIn 0.3s ease-out',
          boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05))',
            borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '22px' }}>👨‍💼</span>
              <div>
                <div style={{
                  color: '#d4af37',
                  fontSize: '14px',
                  fontWeight: '600',
                  fontFamily: "'Playfair Display', serif",
                }}>Farzad</div>
                <div style={{
                  color: '#888',
                  fontSize: '11px',
                  fontFamily: "'Inter', sans-serif",
                }}>Firuzeh Virtual Host</div>
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.08)',
                color: '#999',
                cursor: 'pointer',
                fontSize: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(239, 68, 68, 0.2)'
                e.target.style.color = '#ef4444'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.08)'
                e.target.style.color = '#999'
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {error && (
              <div style={{
                padding: '12px 16px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '13px',
                fontFamily: "'Inter', sans-serif",
                borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
              }}>
                {error}
                <button
                  onClick={startSession}
                  style={{
                    marginLeft: '8px',
                    background: 'none',
                    border: '1px solid #ef4444',
                    color: '#ef4444',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >Retry</button>
              </div>
            )}

            {loading && !session && (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '12px',
                minHeight: '300px',
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #d4af37',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
                <span style={{ color: '#999', fontSize: '13px', fontFamily: "'Inter', sans-serif" }}>
                  Connecting to Farzad...
                </span>
              </div>
            )}

            {session && (
              <LiveKitRoom
                serverUrl={session.serverUrl}
                token={session.token}
                connect={true}
                audio={true}
                video={false}
                onDisconnected={handleClose}
                onError={(error) => {
                  if (error?.message?.includes('participant') && error?.message?.includes('not present')) {
                    return
                  }
                  console.error('LiveKit error:', error)
                }}
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <AvatarVideoInner onClose={handleClose} />
                <RoomAudioRenderer />
              </LiveKitRoom>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// =============================================
// MENU DATA
// =============================================
const MENU = {
  charcoalGrill: [
    { name: 'Kabab-E Koobideh', price: 70, desc: 'Minced lamb kebab with onion & saffron, grilled tomato & saffron rice' },
    { name: 'Kebab e Soltani', price: 99, desc: 'Kabab-E Barg & Kabab-E Koobideh with grilled tomato & saffron rice' },
    { name: 'Kabab E Barg', price: 90, desc: 'Lamb tenderloin steak marinated with saffron & onion' },
    { name: 'Kabab E Chenjeh', price: 75, desc: 'Lamb tenderloin cubes marinated with saffron & onion' },
    { name: 'Joojeh Kabab-E Za\'aferani', price: 70, desc: 'Chicken breast marinated with saffron & onion' },
    { name: 'Joojeh Masti', price: 75, desc: 'Chicken breast marinated with yoghurt & black pepper' },
    { name: 'Firuzeh Signature', price: 120, desc: 'Our signature charcoal grill creation' },
    { name: 'Shishlik-E Makhsoos', price: 170, desc: 'Lamb chops marinated with saffron, onion & black pepper' },
  ],
  mainCourse: [
    { name: 'Baghali Polo Ba Gardan', price: 145, desc: 'Slow-cooked lamb neck with aromatic dill & broad bean rice' },
    { name: 'Baghali Polo Ba Mahicheh', price: 120, desc: 'Slow-cooked lamb shank with aromatic dill & broad bean rice' },
    { name: 'Chelo Khoresht-E Fesenjan', price: 95, desc: 'Chicken stew in pomegranate molasses & walnut sauce' },
    { name: 'Chelo Khoresht-E Ghormeh Sabzi', price: 80, desc: 'Lamb stew with herbs, red kidney beans & dried lemon' },
    { name: 'Sabzi Polo Ba Mahi Seabass', price: 110, desc: 'Whole fried seabass with herb rice & kookoo sabzi' },
    { name: 'Grilled Tiger Prawns', price: 149, desc: 'Grilled tiger prawns with vegetables & wedge potatoes' },
    { name: 'Lobster 500gms', price: 199, desc: 'Thermidor, charcoal grilled, or baked with lemon & olive oil' },
  ],
  dizzi: [
    { name: 'Dizzi Makhsoos', price: 75, desc: 'Lamb, chickpeas, beans, onion, tomato, potato with sangak bread' },
    { name: 'Dizzi Boz Bash', price: 75, desc: 'Lamb, chickpeas, baby leeks, white beans, fenugreek' },
    { name: 'Dizzi Ghajari', price: 75, desc: 'Lamb, chickpeas, white beans, pomegranate sauce' },
    { name: 'Dizzi Kashk', price: 75, desc: 'Lamb, sun dried yogurt, chickpeas, white beans' },
  ],
  soups: [
    { name: 'Ashe Reshteh', price: 30, desc: 'Noodle soup with vegetables, lentils, chickpeas & pinto beans' },
    { name: 'AAB Douge Khiar', price: 28, desc: 'Persian chilled soup with yoghurt, cucumber, herbs & walnuts' },
    { name: 'Soup of the Day', price: 30, desc: 'Ask our staff for today\'s special' },
  ],
  desserts: [
    { name: 'Baklava', price: 59, desc: 'Traditional Turkish baklava' },
    { name: 'Saffron Milk Cake', price: 45, desc: 'Persian-inspired saffron milk cake' },
    { name: 'Cheese Cake', price: 45, desc: 'Classic cheesecake' },
    { name: 'Halva', price: 25, desc: 'Flour, sugar, rose water, cardamom & saffron' },
    { name: 'Ferni', price: 20, desc: 'Rose water, sugar & starch pudding' },
  ],
}

const TESTIMONIALS = [
  { name: 'Mohamed R.', text: 'First time to experience persian food and it\'s really amazing. The kebab soltani is a big piece of tenderloin which was so delicious!', date: 'Jan 2024' },
  { name: 'Seaon S.', text: 'Some of the most delicious Persian food I have ever had! The atmosphere, ambience, and service was all stellar.', date: 'Jan 2024' },
  { name: 'Alma S.', text: 'Great customer service and restaurant space. Amazing food.', date: 'Jan 2024' },
  { name: 'Shiva N.', text: 'Very nice kubideh and sangak bread, excellent service! Definitely going back again!', date: 'Jan 2024' },
]

// =============================================
// RESTAURANT WEBSITE
// =============================================
function RestaurantSite() {
  const [activeMenu, setActiveMenu] = useState('charcoalGrill')

  const menuLabels = {
    charcoalGrill: 'Charcoal Grill',
    mainCourse: 'Main Course',
    dizzi: 'Dizzi',
    soups: 'Soups',
    desserts: 'Desserts',
  }

  return (
    <div style={{
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#e0e0e0',
      background: '#0a0a0a',
      minHeight: '100vh',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: 'rgba(10, 10, 10, 0.92)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(212, 175, 55, 0.15)',
        padding: '0 40px',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '72px',
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '24px',
            fontWeight: '700',
            color: '#d4af37',
            letterSpacing: '3px',
          }}>FIRUZEH</div>
          <div style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
            {['Home', 'Menu', 'About', 'Contact'].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                style={{
                  color: '#bbb',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: '500',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  transition: 'color 0.3s',
                }}
                onMouseEnter={(e) => e.target.style.color = '#d4af37'}
                onMouseLeave={(e) => e.target.style.color = '#bbb'}
              >{item}</a>
            ))}
            <a
              href="https://wa.me/message/HBMZIJES7PYJI1"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #d4af37, #b8962e)',
                color: '#000',
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderRadius: '4px',
                transition: 'opacity 0.3s',
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.85'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >Book a Table</a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        position: 'relative',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 30%, #0a0a0a 70%, #1a0a0a 100%)',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(212, 175, 55, 0.06) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.03) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', padding: '0 20px' }}>
          <div style={{
            width: '60px',
            height: '1px',
            background: '#d4af37',
            margin: '0 auto 24px',
          }} />
          <p style={{
            color: '#d4af37',
            fontSize: '14px',
            letterSpacing: '6px',
            textTransform: 'uppercase',
            fontWeight: '500',
            margin: '0 0 16px',
          }}>Welcome to</p>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(48px, 8vw, 80px)',
            fontWeight: '700',
            color: '#ffffff',
            margin: '0 0 16px',
            letterSpacing: '6px',
            lineHeight: '1.1',
          }}>FIRUZEH</h1>
          <p style={{
            color: '#d4af37',
            fontSize: '16px',
            letterSpacing: '8px',
            textTransform: 'uppercase',
            fontWeight: '400',
            margin: '0 0 32px',
          }}>Fine Iranian Dining</p>
          <p style={{
            color: '#999',
            fontSize: '16px',
            lineHeight: '1.8',
            margin: '0 0 40px',
            maxWidth: '500px',
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            Delicious, well-prepared authentic Persian food crafted with the finest ingredients in the heart of Dubai Marina.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <a
              href="#menu"
              style={{
                padding: '14px 40px',
                background: 'linear-gradient(135deg, #d4af37, #b8962e)',
                color: '#000',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                textDecoration: 'none',
                borderRadius: '4px',
                transition: 'opacity 0.3s',
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.85'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >View Menu</a>
            <a
              href="https://wa.me/message/HBMZIJES7PYJI1"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '14px 40px',
                background: 'transparent',
                color: '#d4af37',
                fontSize: '13px',
                fontWeight: '700',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                textDecoration: 'none',
                border: '1px solid rgba(212, 175, 55, 0.4)',
                borderRadius: '4px',
                transition: 'all 0.3s',
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(212, 175, 55, 0.1)'
                e.target.style.borderColor = 'rgba(212, 175, 55, 0.7)'
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent'
                e.target.style.borderColor = 'rgba(212, 175, 55, 0.4)'
              }}
            >Reserve Table</a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" style={{
        padding: '120px 40px',
        maxWidth: '1000px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <p style={{
          color: '#d4af37',
          fontSize: '13px',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          fontWeight: '500',
          margin: '0 0 12px',
        }}>Our Story</p>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '42px',
          fontWeight: '700',
          color: '#fff',
          margin: '0 0 24px',
        }}>About Firuzeh Restaurant</h2>
        <div style={{
          width: '40px',
          height: '2px',
          background: '#d4af37',
          margin: '0 auto 32px',
        }} />
        <p style={{
          color: '#aaa',
          fontSize: '16px',
          lineHeight: '2',
          maxWidth: '800px',
          margin: '0 auto 24px',
        }}>
          Welcome to Firuzeh, where authentic Persian culinary artistry meets the highest quality ingredients.
          Our restaurant is a true oasis for connoisseurs of classic Persian cuisine. Immerse yourself in the
          rich and diverse flavours of Iran, meticulously crafted using only the finest and freshest ingredients.
        </p>
        <p style={{
          color: '#aaa',
          fontSize: '16px',
          lineHeight: '2',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          Located in the heart of Dubai Marina at Marsa Village, our fine dining restaurant invites you
          to savor the authentic taste of Persia in a luxurious and elegant setting. From succulent kebabs
          to aromatic rice dishes and decadent desserts, each dish is a symphony of taste.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '40px',
          marginTop: '60px',
        }}>
          {[
            { num: '4.7★', label: 'Google Rating' },
            { num: '290+', label: 'Reviews' },
            { num: '166+', label: 'Menu Items' },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: '32px 20px',
              border: '1px solid rgba(212, 175, 55, 0.15)',
              borderRadius: '12px',
              background: 'rgba(212, 175, 55, 0.03)',
            }}>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '36px',
                fontWeight: '700',
                color: '#d4af37',
                marginBottom: '8px',
              }}>{stat.num}</div>
              <div style={{
                color: '#888',
                fontSize: '13px',
                letterSpacing: '2px',
                textTransform: 'uppercase',
              }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Menu Section */}
      <section id="menu" style={{
        padding: '120px 40px',
        background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.02) 0%, transparent 100%)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{
              color: '#d4af37',
              fontSize: '13px',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              fontWeight: '500',
              margin: '0 0 12px',
            }}>Explore</p>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '42px',
              fontWeight: '700',
              color: '#fff',
              margin: '0 0 24px',
            }}>Our Menu</h2>
            <div style={{
              width: '40px',
              height: '2px',
              background: '#d4af37',
              margin: '0 auto 32px',
            }} />
          </div>

          {/* Menu Tabs */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            marginBottom: '48px',
          }}>
            {Object.entries(menuLabels).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveMenu(key)}
                style={{
                  padding: '10px 24px',
                  background: activeMenu === key
                    ? 'linear-gradient(135deg, #d4af37, #b8962e)'
                    : 'rgba(255,255,255,0.04)',
                  color: activeMenu === key ? '#000' : '#bbb',
                  border: activeMenu === key ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '30px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  letterSpacing: '0.5px',
                }}
              >{label}</button>
            ))}
          </div>

          {/* Menu Items */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '20px',
          }}>
            {MENU[activeMenu].map((item, i) => (
              <div
                key={i}
                style={{
                  padding: '24px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                  transition: 'all 0.3s',
                  cursor: 'default',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(212, 175, 55, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px',
                }}>
                  <h3 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#fff',
                    margin: 0,
                    flex: 1,
                    paddingRight: '16px',
                  }}>{item.name}</h3>
                  <span style={{
                    color: '#d4af37',
                    fontSize: '16px',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                  }}>{item.price} AED</span>
                </div>
                <p style={{
                  color: '#888',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  margin: 0,
                }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{
        padding: '120px 40px',
      }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <p style={{
              color: '#d4af37',
              fontSize: '13px',
              letterSpacing: '4px',
              textTransform: 'uppercase',
              fontWeight: '500',
              margin: '0 0 12px',
            }}>Testimonials</p>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '42px',
              fontWeight: '700',
              color: '#fff',
              margin: '0',
            }}>What Our Guests Say</h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '24px',
          }}>
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                style={{
                  padding: '32px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '12px',
                }}
              >
                <div style={{
                  color: '#d4af37',
                  fontSize: '32px',
                  lineHeight: 1,
                  marginBottom: '16px',
                  fontFamily: "'Playfair Display', serif",
                }}>"</div>
                <p style={{
                  color: '#bbb',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  margin: '0 0 20px',
                  fontStyle: 'italic',
                }}>{t.text}</p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}>{t.name}</span>
                  <span style={{
                    color: '#666',
                    fontSize: '12px',
                  }}>{t.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact / Location */}
      <section id="contact" style={{
        padding: '120px 40px',
        background: 'linear-gradient(180deg, transparent, rgba(212, 175, 55, 0.02))',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{
            color: '#d4af37',
            fontSize: '13px',
            letterSpacing: '4px',
            textTransform: 'uppercase',
            fontWeight: '500',
            margin: '0 0 12px',
          }}>Visit Us</p>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: '42px',
            fontWeight: '700',
            color: '#fff',
            margin: '0 0 32px',
          }}>Find Us</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '32px',
            marginBottom: '48px',
          }}>
            <div style={{
              padding: '32px 24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>📍</div>
              <h3 style={{
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                margin: '0 0 8px',
                fontFamily: "'Playfair Display', serif",
              }}>Location</h3>
              <p style={{ color: '#999', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                Marsa Village, Marina View Towers, Marina Walk, Dubai
              </p>
            </div>
            <div style={{
              padding: '32px 24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>📞</div>
              <h3 style={{
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                margin: '0 0 8px',
                fontFamily: "'Playfair Display', serif",
              }}>Contact</h3>
              <p style={{ color: '#999', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                Tel: 800 (MARSA) 62772<br/>
                WhatsApp: 050-2435680
              </p>
            </div>
            <div style={{
              padding: '32px 24px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '12px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>🕐</div>
              <h3 style={{
                color: '#fff',
                fontSize: '16px',
                fontWeight: '600',
                margin: '0 0 8px',
                fontFamily: "'Playfair Display', serif",
              }}>Hours</h3>
              <p style={{ color: '#999', fontSize: '14px', lineHeight: '1.6', margin: 0 }}>
                Daily: 7:00 AM – 2:00 AM<br/>
                Breakfast: 7:00 AM – 12:00 PM
              </p>
            </div>
          </div>

          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3613.123456789!2d55.13456!3d25.07654!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sFiruzeh+Restaurant+Dubai+Marina!5e0!3m2!1sen!2sae!4v1234567890"
              width="100%"
              height="300"
              style={{ border: 0, filter: 'grayscale(0.8) contrast(1.1) brightness(0.8)' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Firuzeh Location"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        padding: '48px 40px 32px',
        borderTop: '1px solid rgba(212, 175, 55, 0.1)',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: '28px',
          fontWeight: '700',
          color: '#d4af37',
          letterSpacing: '4px',
          marginBottom: '16px',
        }}>FIRUZEH</div>
        <p style={{
          color: '#666',
          fontSize: '12px',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          margin: '0 0 24px',
        }}>Fine Iranian Dining • Dubai Marina</p>
        <p style={{
          color: '#444',
          fontSize: '12px',
          margin: 0,
        }}>© 2026 Firuzeh Restaurant. All rights reserved.</p>
      </footer>

      {/* Avatar Widget */}
      <AvatarWidget />
    </div>
  )
}

// =============================================
// MAIN COMPONENT
// =============================================
export default function FiruzehDemo() {
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const token = sessionStorage.getItem('firuzeh_demo_token')
    if (token) {
      try {
        const decoded = atob(token)
        if (decoded.startsWith('demo:')) {
          setAuthenticated(true)
        }
      } catch {}
    }
  }, [])

  if (!authenticated) {
    return <PasswordGate onAuthenticated={() => setAuthenticated(true)} />
  }

  return <RestaurantSite />
}
