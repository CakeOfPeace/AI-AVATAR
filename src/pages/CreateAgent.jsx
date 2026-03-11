import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useApi'
import { 
  Brain, 
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertCircle,
  Globe,
  Heart,
  Database,
  Cpu,
  Volume2,
  MessageSquare,
  Sparkles
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useEquos } from '@/hooks/useEquos'
import { 
  providers, 
  getVoicesByProvider, 
  getModelsByProvider,
  agentFeatures,
  agentDefaults
} from '@/data/equos'
import { cn } from '@/lib/utils'

const steps = [
  { id: 1, title: 'Provider', description: 'Select AI provider' },
  { id: 2, title: 'Model & Voice', description: 'Configure model and voice' },
  { id: 3, title: 'Personality', description: 'Set instructions and greeting' },
  { id: 4, title: 'Features', description: 'Enable capabilities' },
  { id: 5, title: 'Review', description: 'Confirm and create' }
]

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
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
          {index < steps.length - 1 && (
            <div 
              className={cn(
                "w-16 h-1 mx-2 rounded transition-colors",
                currentStep > step.id ? "bg-primary" : "bg-secondary"
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function ProviderCard({ provider, selected, onSelect }) {
  const icons = {
    gemini: '🔷',
    openai: '🟢',
    elevenlabs: '🟣'
  }

  return (
    <button
      onClick={() => onSelect(provider.id)}
      className={cn(
        "p-6 rounded-xl border-2 transition-all text-left",
        selected 
          ? "border-primary bg-primary/5"
          : "border-border/50 hover:border-primary/30 hover:bg-secondary/50"
      )}
    >
      <div className="flex items-start gap-4">
        <span className="text-3xl">{icons[provider.id]}</span>
        <div>
          <h3 className="font-semibold text-lg">{provider.name}</h3>
          <p className="text-sm text-muted-foreground mt-1">{provider.description}</p>
        </div>
        {selected && (
          <Check className="w-5 h-5 text-primary ml-auto" />
        )}
      </div>
    </button>
  )
}

function VoiceCard({ voice, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(voice.id)}
      className={cn(
        "p-4 rounded-lg border transition-all text-left",
        selected 
          ? "border-primary bg-primary/5"
          : "border-border/50 hover:border-primary/30"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="font-medium">{voice.name}</p>
            <p className="text-xs text-muted-foreground">{voice.gender} • {voice.accent}</p>
          </div>
        </div>
        {selected && <Check className="w-4 h-4 text-primary" />}
      </div>
    </button>
  )
}

function FeatureToggle({ feature, enabled, onToggle }) {
  const icons = {
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

export default function CreateAgent() {
  const { isAdmin } = useAuth()
  const navigate = useNavigate()
  
  // Redirect non-admin users - regular users create agents via Create Avatar
  if (!isAdmin) {
    return <Navigate to="/create" replace />
  }

  const [currentStep, setCurrentStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  
  const [formData, setFormData] = useState({
    name: '',
    provider: agentDefaults.provider,
    model: agentDefaults.model,
    voice: agentDefaults.voice,
    instructions: '',
    greetingMsg: '',
    search: false,
    emotions: false,
    memory: false
  })

  const { createAgent } = useEquos()

  const voices = getVoicesByProvider(formData.provider)
  const models = getModelsByProvider(formData.provider)

  const handleProviderChange = (provider) => {
    const newModels = getModelsByProvider(provider)
    const newVoices = getVoicesByProvider(provider)
    
    setFormData({
      ...formData,
      provider,
      model: newModels[0]?.id || '',
      voice: newVoices[0]?.id || ''
    })
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return !!formData.provider
      case 2:
        return !!formData.model || models.length === 0
      case 3:
        return !!formData.name
      case 4:
        return true
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

  const handleCreate = async () => {
    setIsCreating(true)
    setCreateError(null)
    
    try {
      const agentData = {
        name: formData.name,
        provider: formData.provider,
        ...(formData.model && { model: formData.model }),
        ...(formData.voice && { voice: formData.voice }),
        ...(formData.instructions && { instructions: formData.instructions }),
        ...(formData.greetingMsg && { greetingMsg: formData.greetingMsg }),
        search: formData.search,
        emotions: formData.emotions,
        memory: formData.memory
      }

      await createAgent(agentData)
      navigate('/agents')
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" onClick={() => navigate('/agents')} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Agents
        </Button>
        <h1 className="text-3xl font-bold">Create Agent</h1>
        <p className="text-muted-foreground mt-1">
          Configure your AI agent step by step
        </p>
      </div>

      <StepIndicator currentStep={currentStep} />

      {/* Step Content */}
      <Card className="glass border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentStep === 1 && <Cpu className="w-5 h-5 text-primary" />}
            {currentStep === 2 && <Volume2 className="w-5 h-5 text-primary" />}
            {currentStep === 3 && <MessageSquare className="w-5 h-5 text-primary" />}
            {currentStep === 4 && <Sparkles className="w-5 h-5 text-primary" />}
            {currentStep === 5 && <Check className="w-5 h-5 text-primary" />}
            {steps[currentStep - 1].title}
          </CardTitle>
          <CardDescription>{steps[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Provider Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {providers.map((provider) => (
                <ProviderCard
                  key={provider.id}
                  provider={provider}
                  selected={formData.provider === provider.id}
                  onSelect={handleProviderChange}
                />
              ))}
            </div>
          )}

          {/* Step 2: Model & Voice */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {models.length > 0 && (
                <div className="space-y-3">
                  <Label>Model</Label>
                  <Select
                    value={formData.model}
                    onValueChange={(v) => setFormData({ ...formData, model: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div>
                            <span className="font-medium">{m.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">{m.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {voices.length > 0 && (
                <div className="space-y-3">
                  <Label>Voice</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto pr-2">
                    {voices.map((voice) => (
                      <VoiceCard
                        key={voice.id}
                        voice={voice}
                        selected={formData.voice === voice.id}
                        onSelect={(v) => setFormData({ ...formData, voice: v })}
                      />
                    ))}
                  </div>
                </div>
              )}

              {models.length === 0 && voices.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No specific model or voice configuration needed for {formData.provider}.</p>
                  <p className="text-sm mt-2">Click Next to continue.</p>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Personality */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Agent Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Customer Support Agent, Sales Assistant"
                />
              </div>

              <div className="space-y-2">
                <Label>Instructions (System Prompt)</Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value.slice(0, 5500) })}
                  placeholder="You are a helpful AI assistant specializing in..."
                  rows={6}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <p>Define the agent's personality, behavior, and expertise.</p>
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
                  The first message the agent will say when a session starts.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Features */}
          {currentStep === 4 && (
            <div className="space-y-4">
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
              {createError && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{formData.name}</span>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Provider</span>
                  <Badge variant="outline">{formData.provider}</Badge>
                </div>

                {formData.model && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <span className="text-muted-foreground">Model</span>
                    <span className="font-medium text-sm">{formData.model.split('-').slice(0, 3).join('-')}</span>
                  </div>
                )}

                {formData.voice && (
                  <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                    <span className="text-muted-foreground">Voice</span>
                    <span className="font-medium">{formData.voice}</span>
                  </div>
                )}

                {formData.instructions && (
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <span className="text-muted-foreground text-sm">Instructions</span>
                    <p className="mt-2 text-sm line-clamp-3">{formData.instructions}</p>
                  </div>
                )}

                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                  <span className="text-muted-foreground">Features</span>
                  <div className="flex gap-2 flex-wrap">
                    {formData.search && <Badge variant="secondary">Search</Badge>}
                    {formData.emotions && <Badge variant="secondary">Emotions</Badge>}
                    {formData.memory && <Badge variant="secondary">Memory</Badge>}
                    {!formData.search && !formData.emotions && !formData.memory && (
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
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Create Agent
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
