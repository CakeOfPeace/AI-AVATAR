import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Sparkles, 
  Loader2,
  Check,
  AlertCircle,
  Upload,
  Image,
  ArrowLeft,
  ArrowRight,
  Volume2,
  MessageSquare,
  Globe,
  Heart,
  Database,
  Play,
  Square,
  Eye
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { useEquos } from '@/hooks/useEquos'
import { useAuth } from '@/hooks/useApi'
import { 
  getVoicesByProvider, 
  agentFeatures,
  agentDefaults,
  generateAvatarIdentity,
  voiceSamples
} from '@/data/equos'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, title: 'Image', description: 'Upload a reference image for your avatar', icon: Image },
  { id: 2, title: 'Name & Voice', description: 'Name your avatar and choose its voice', icon: Volume2 },
  { id: 3, title: 'Personality', description: 'Define how your avatar communicates', icon: MessageSquare },
  { id: 4, title: 'Features', description: 'Enable AI capabilities', icon: Sparkles },
  { id: 5, title: 'Review', description: 'Review and create your avatar', icon: Check },
]

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {STEPS.map((step, index) => (
        <div key={step.id} className="flex items-center">
          <div 
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
              currentStep > step.id 
                ? "bg-primary text-primary-foreground"
                : currentStep === step.id
                ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                : "bg-secondary text-muted-foreground"
            )}
          >
            {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
          </div>
          {index < STEPS.length - 1 && (
            <div 
              className={cn(
                "w-12 h-1 mx-2 rounded transition-colors",
                currentStep > step.id ? "bg-primary" : "bg-secondary"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}


function VoiceCard({ voice, selected, onSelect, isPlaying, onPlaySample }) {
  const sampleUrl = voiceSamples[voice.id]
  
  const handlePlayClick = (e) => {
    e.stopPropagation()
    if (sampleUrl) {
      onPlaySample(voice.id, sampleUrl)
    }
  }
  
  return (
    <button
      onClick={() => onSelect(voice.id)}
      className={cn(
        "p-3 rounded-lg border transition-all text-left",
        selected 
          ? "border-primary bg-primary/5"
          : "border-border/50 hover:border-primary/30"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div 
            onClick={handlePlayClick}
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer",
              isPlaying 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary hover:bg-primary/20"
            )}
          >
            {isPlaying ? (
              <Square className="w-3 h-3" />
            ) : (
              <Play className="w-3 h-3 ml-0.5" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{voice.name}</p>
            <p className="text-xs text-muted-foreground truncate">{voice.gender} • {voice.accent}</p>
          </div>
        </div>
        {selected && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
      </div>
    </button>
  )
}

function FeatureToggle({ feature, enabled, onToggle }) {
  const icons = {
    vision: Eye,
    search: Globe,
    emotions: Heart,
    memory: Database
  }
  const Icon = icons[feature.id]

  return (
    <div 
      className={cn(
        "p-4 rounded-xl border-2 transition-all cursor-pointer",
        enabled ? "border-primary bg-primary/5" : "border-border/50"
      )}
      onClick={onToggle}
    >
      <div className="flex items-start gap-4">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          enabled ? "bg-primary/20" : "bg-secondary"
        )}>
          <Icon className={cn("w-5 h-5", enabled ? "text-primary" : "text-muted-foreground")} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{feature.name}</h4>
            <Switch checked={enabled} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
        </div>
      </div>
    </div>
  )
}

export default function CreateAvatar() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { createCombinedAvatar } = useEquos()
  const isAdmin = user?.role === 'admin'
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  
  // Audio playback state
  const audioRef = useRef(null)
  const [playingVoice, setPlayingVoice] = useState(null)
  
  const [formData, setFormData] = useState({
    // Avatar fields
    refImage: null,
    identity: '',
    // Shared field
    name: '',
    // Agent fields - voice only, provider/model are always Gemini defaults
    voice: agentDefaults.voice,
    instructions: '',
    greetingMsg: '',
    // Features
    vision: false,
    search: false,
    emotions: false,
    memory: false
  })
  
  const [uploadPreview, setUploadPreview] = useState(null)
  const [errors, setErrors] = useState({})

  // Always use Gemini voices
  const voices = getVoicesByProvider('gemini')
  
  // Handle voice sample playback
  const handlePlaySample = (voiceId, sampleUrl) => {
    // If same voice is playing, stop it
    if (playingVoice === voiceId) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setPlayingVoice(null)
      return
    }
    
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause()
    }
    
    // Create and play new audio
    const audio = new Audio(sampleUrl)
    audioRef.current = audio
    setPlayingVoice(voiceId)
    
    audio.play().catch(err => {
      console.error('Failed to play audio:', err)
      setPlayingVoice(null)
    })
    
    audio.onended = () => {
      setPlayingVoice(null)
      audioRef.current = null
    }
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, refImage: 'Please upload an image file' })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, refImage: 'Image must be less than 5MB' })
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result
      setFormData(prev => ({ ...prev, refImage: base64 }))
      setUploadPreview(base64)
      setErrors(prev => ({ ...prev, refImage: null }))
    }
    reader.onerror = () => {
      setErrors({ ...errors, refImage: 'Failed to read image file' })
    }
    reader.readAsDataURL(file)
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!formData.refImage
      case 2:
        return !!formData.name.trim()
      case 3:
        return true // Instructions and greeting are optional
      case 4:
        return true // Features are optional
      case 5:
        return true
      default:
        return false
    }
  }

  const handleNext = () => {
    if (currentStep < 5 && canProceed()) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!formData.refImage) {
      setSubmitError('Please upload an image for your avatar.')
      return
    }
    if (!formData.name.trim()) {
      setSubmitError('Avatar name is required.')
      return
    }
    
    setIsSubmitting(true)
    setSubmitError(null)
    
    try {
      const identity = formData.identity || generateAvatarIdentity(formData.name)
      
      const data = {
        // Avatar data
        name: formData.name.trim(),
        refImage: formData.refImage,
        identity: identity,
        // Agent data - no provider/model needed, backend uses defaults
        ...(formData.voice && { voice: formData.voice }),
        ...(formData.instructions && { instructions: formData.instructions }),
        ...(formData.greetingMsg && { greetingMsg: formData.greetingMsg }),
        // Features
        vision: formData.vision,
        search: formData.search,
        emotions: formData.emotions,
        memory: formData.memory
      }
      
      await createCombinedAvatar(data)
      setIsComplete(true)
      
      setTimeout(() => {
        navigate('/avatars')
      }, 2000)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isComplete) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="glass border-border/50 max-w-md text-center">
          <CardContent className="p-8">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Avatar Created!</h2>
            <p className="text-muted-foreground mb-4">
              Your avatar has been created successfully and is ready to use.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecting to your avatars...
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const StepIcon = STEPS[currentStep - 1].icon

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/avatars')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Avatars
        </Button>
        <h1 className="text-3xl font-bold">Create Avatar</h1>
        <p className="text-muted-foreground mt-1">
          Build your AI-powered avatar step by step
        </p>
      </div>

      <StepIndicator currentStep={currentStep} />

      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StepIcon className="w-5 h-5 text-primary" />
            {STEPS[currentStep - 1].title}
          </CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Image Upload */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center hover:border-primary/30 transition-colors">
                {uploadPreview ? (
                  <div className="space-y-4">
                    <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden bg-secondary">
                      <img 
                        src={uploadPreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, refImage: null }))
                        setUploadPreview(null)
                      }}
                    >
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <div className="space-y-4">
                      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Upload className="w-10 h-10 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Click to upload an image</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                      <Button variant="outline" className="pointer-events-none">
                        <Upload className="w-4 h-4 mr-2" />
                        Choose File
                      </Button>
                    </div>
                  </label>
                )}
              </div>
              {errors.refImage && (
                <p className="text-sm text-destructive">{errors.refImage}</p>
              )}
              <div className="bg-secondary/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Image Guidelines</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use a clear, front-facing headshot photo</li>
                  <li>• <strong className="text-foreground">Face must not be too close to the edges</strong></li>
                  <li>• Leave space around the head (don't crop too tight)</li>
                  <li>• Good lighting and high resolution recommended</li>
                  <li>• Maximum file size: 5MB</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 2: Name & Voice */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Avatar Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Avatar Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Support Assistant"
                  className={cn(!formData.name.trim() && 'border-destructive/50')}
                />
              </div>

              {/* Identity (Admin only) */}
              {isAdmin && (
                <div className="space-y-2">
                  <Label htmlFor="identity">Identity (Optional)</Label>
                  <Input
                    id="identity"
                    value={formData.identity}
                    onChange={(e) => setFormData({ ...formData, identity: e.target.value })}
                    placeholder="Auto-generated from name"
                  />
                  <p className="text-xs text-muted-foreground">
                    A unique identifier for this avatar. Leave blank to auto-generate.
                  </p>
                </div>
              )}

              {/* Voice Selection */}
              {voices.length > 0 && (
                <div className="space-y-3">
                  <Label>Voice</Label>
                  <p className="text-xs text-muted-foreground -mt-1">
                    Click the play button to hear a sample of each voice
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                    {voices.map((voice) => (
                      <VoiceCard
                        key={voice.id}
                        voice={voice}
                        selected={formData.voice === voice.id}
                        onSelect={(v) => setFormData({ ...formData, voice: v })}
                        isPlaying={playingVoice === voice.id}
                        onPlaySample={handlePlaySample}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Personality */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Instructions (System Prompt)</Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value.slice(0, 5500) })}
                  placeholder="You are a helpful AI assistant specializing in..."
                  rows={6}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <p>Define your avatar's personality, behavior, and expertise.</p>
                  <span className={cn(formData.instructions.length >= 5500 && "text-destructive")}>
                    {formData.instructions.length}/5500
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Greeting Message</Label>
                <Textarea
                  value={formData.greetingMsg}
                  onChange={(e) => setFormData({ ...formData, greetingMsg: e.target.value })}
                  placeholder="Hello! I'm here to help you with..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  The first message your avatar will say when a session starts.
                </p>
              </div>

              {/* Preview */}
              {uploadPreview && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary">
                    <img 
                      src={uploadPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{formData.name || 'Your Avatar'}</p>
                    <p className="text-sm text-muted-foreground">
                      {formData.provider} • {formData.voice || 'Default voice'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Features */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                Enable additional AI capabilities for your avatar.
              </p>
              {agentFeatures.map((feature) => (
                <FeatureToggle
                  key={feature.id}
                  feature={feature}
                  enabled={formData[feature.id]}
                  onToggle={() => setFormData({ ...formData, [feature.id]: !formData[feature.id] })}
                />
              ))}
            </div>
          )}

          {/* Step 5: Review */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {submitError && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Avatar Preview */}
              <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/50">
                {uploadPreview && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-secondary flex-shrink-0">
                    <img 
                      src={uploadPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg">{formData.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formData.identity || 'Identity will be auto-generated'}
                  </p>
                </div>
              </div>

              {/* Configuration Summary */}
              <div className="space-y-3">
                {formData.voice && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-muted-foreground">Voice</span>
                    <span className="font-medium">{formData.voice}</span>
                  </div>
                )}

                {formData.instructions && (
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <span className="text-muted-foreground text-sm">Instructions</span>
                    <p className="mt-2 text-sm line-clamp-2">{formData.instructions}</p>
                  </div>
                )}

                {formData.greetingMsg && (
                  <div className="p-3 rounded-lg bg-secondary/50">
                    <span className="text-muted-foreground text-sm">Greeting</span>
                    <p className="mt-2 text-sm line-clamp-2">{formData.greetingMsg}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Features</span>
                  <div className="flex gap-2 flex-wrap">
                    {formData.vision && <Badge variant="secondary">Vision</Badge>}
                    {formData.search && <Badge variant="secondary">Web Search</Badge>}
                    {formData.emotions && <Badge variant="secondary">Emotions</Badge>}
                    {formData.memory && <Badge variant="secondary">Memory</Badge>}
                    {!formData.vision && !formData.search && !formData.emotions && !formData.memory && (
                      <span className="text-sm text-muted-foreground">None enabled</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button 
          variant="outline" 
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < 5 ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Avatar
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
