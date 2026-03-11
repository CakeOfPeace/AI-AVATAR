import { Link } from 'react-router-dom'
import { ArrowLeft, Book, Terminal } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'

function CodeBlock({ children, language = 'bash' }) {
  return (
    <div className="relative mt-2 mb-4 rounded-lg bg-secondary/50 border border-border/50 overflow-hidden group">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Badge variant="outline" className="text-xs bg-background/50 backdrop-blur-sm">{language}</Badge>
      </div>
      <ScrollArea className="w-full">
        <pre className="p-4 text-xs sm:text-sm font-mono overflow-x-auto">
          {children}
        </pre>
      </ScrollArea>
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <div id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span className="w-1 h-8 rounded-full bg-primary inline-block"></span>
        {title}
      </h2>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

function SubSection({ title, method, endpoint, children }) {
  const methodColor = {
    GET: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    POST: 'bg-green-500/10 text-green-500 border-green-500/20',
    PUT: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    DELETE: 'bg-red-500/10 text-red-500 border-red-500/20',
    PATCH: 'bg-purple-500/10 text-purple-500 border-purple-500/20'
  }

  return (
    <Card className="mb-6 border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {method && endpoint && (
            <div className="flex items-center gap-2 font-mono text-sm">
              <Badge variant="outline" className={methodColor[method] || ''}>
                {method}
              </Badge>
              <span className="text-muted-foreground">{endpoint}</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}

export default function ApiDocs() {
  const baseUrl = `${window.location.protocol}//${window.location.host}/api/v1`

  return (
    <div className="max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4 pl-0 hover:pl-2 transition-all">
          <Link to="/keys">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to API Keys
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Book className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">API Documentation</h1>
            <p className="text-muted-foreground mt-1">
              Programmatically manage avatars and sessions
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar Navigation */}
        <div className="hidden lg:block relative">
          <div className="sticky top-24 space-y-1">
            <p className="font-semibold mb-2 px-2 text-sm">Guides</p>
            <a href="#authentication" className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors">Authentication</a>
            <a href="#base-url" className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors">Base URL</a>
            <a href="#errors" className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors">Errors</a>
            
            <p className="font-semibold mt-6 mb-2 px-2 text-sm">Resources</p>
            <a href="#avatars" className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors">Avatars</a>
            <a href="#sessions" className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md transition-colors">Sessions</a>
          </div>
        </div>

        {/* Content */}
        <div>
          <Section id="authentication" title="Authentication">
            <p className="text-muted-foreground mb-4">
              All API requests must include your API Key in the <code className="bg-secondary/50 px-1.5 py-0.5 rounded text-sm">x-api-key</code> header.
            </p>
            <CodeBlock>
{`curl -X GET ${baseUrl}/avatars \\
  -H "x-api-key: sk_live_..."`}
            </CodeBlock>
            <p className="text-sm text-muted-foreground">
              You can generate API keys from the <Link to="/keys" className="text-primary hover:underline">API Keys</Link> page.
            </p>
          </Section>

          <Section id="base-url" title="Base URL">
            <p className="text-muted-foreground mb-4">
              All endpoints are prefixed with <code className="bg-secondary/50 px-1.5 py-0.5 rounded text-sm">/api/v1</code>.
            </p>
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/50 font-mono text-sm">
              {baseUrl}
            </div>
          </Section>

          <Section id="avatars" title="Avatars">
            <p className="text-muted-foreground mb-6">
              Manage your AI avatars. Creating an avatar automatically provisions the underlying AI agent.
            </p>

            <SubSection title="List Avatars" method="GET" endpoint="/avatars">
              <p className="text-sm text-muted-foreground mb-4">
                Get a list of all avatars you have created.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Parameters</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li><code className="text-xs">take</code> (optional): Number of records (default: 50)</li>
                    <li><code className="text-xs">skip</code> (optional): Records to skip (default: 0)</li>
                  </ul>
                </div>
              </div>
              <CodeBlock language="json">
{`{
  "data": [
    {
      "id": "avatar_id",
      "name": "Customer Support",
      "identity": "avatar-customer-support",
      "thumbnailUrl": "..."
    }
  ],
  "meta": {
    "total": 1,
    "take": 50,
    "skip": 0
  }
}`}
              </CodeBlock>
            </SubSection>

            <SubSection title="Get Avatar" method="GET" endpoint="/avatars/:id">
              <p className="text-sm text-muted-foreground">
                Get details for a specific avatar by its ID.
              </p>
            </SubSection>

            <SubSection title="Create Avatar" method="POST" endpoint="/avatars">
              <p className="text-sm text-muted-foreground mb-4">
                Create a new AI avatar. This process sets up both the visual avatar and the underlying AI agent.
              </p>
              
              <div className="mb-4 bg-secondary/30 p-4 rounded-lg border border-border/50">
                <h4 className="font-medium text-sm mb-2 text-primary">Requirements & Limits</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li><strong>Provider:</strong> Currently only <code className="text-xs">gemini</code> is supported.</li>
                  <li><strong>Image:</strong> Must be a valid Base64 encoded string (JPG/PNG).</li>
                  <li><strong>System Prompt:</strong> <code className="text-xs">instructions</code> field is limited to <strong>5,500 characters</strong>.</li>
                </ul>
              </div>

              <h4 className="font-medium text-sm mb-2">Request Body</h4>
              <CodeBlock language="json">
{`{
  "name": "My AI Assistant",
  "refImage": "data:image/jpeg;base64,...", // Base64 encoded image
  "provider": "gemini", // Only "gemini" is supported
  "model": "gemini-2.5-flash-native-audio-preview-09-2025", // Optional
  "voice": "Puck", // Optional
  "instructions": "You are a helpful assistant...", // Max 5,500 chars
  "greetingMsg": "Hello! How can I help?",
  "search": false, // Enable web search
  "emotions": true, // Enable emotional responses
  "memory": false // Enable long-term memory
}`}
              </CodeBlock>

              <h4 className="font-medium text-sm mb-2">Response</h4>
              <CodeBlock language="json">
{`{
  "data": {
    "avatar": { "id": "...", ... },
    "agent": { "id": "...", ... }
  }
}`}
              </CodeBlock>
            </SubSection>

            <SubSection title="Update Avatar" method="PATCH" endpoint="/avatars/:id">
              <p className="text-sm text-muted-foreground mb-4">
                Update avatar configuration, including prompt and voice settings.
              </p>
              
              <h4 className="font-medium text-sm mb-2">Request Body</h4>
              <CodeBlock language="json">
{`{
  "name": "Updated Name", // Optional
  "instructions": "New system prompt...", // Optional, max 5,500 chars
  "greetingMsg": "New greeting...", // Optional
  "voice": "Charon", // Optional
  "emotions": false // Optional
}`}
              </CodeBlock>
            </SubSection>

            <SubSection title="Delete Avatar" method="DELETE" endpoint="/avatars/:id">
              <p className="text-sm text-muted-foreground">
                Delete an avatar and its associated agent resources. This action is irreversible.
              </p>
            </SubSection>
          </Section>

          <Section id="sessions" title="Sessions">
            <p className="text-muted-foreground mb-6">
              Manage real-time interaction sessions with your avatars.
            </p>

            <SubSection title="List Sessions" method="GET" endpoint="/sessions">
              <p className="text-sm text-muted-foreground mb-4">
                Get a history of sessions.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Parameters</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                    <li><code className="text-xs">avatarId</code> (optional): Filter by avatar</li>
                    <li><code className="text-xs">take</code> (optional): Number of records</li>
                    <li><code className="text-xs">skip</code> (optional): Records to skip</li>
                  </ul>
                </div>
              </div>
            </SubSection>

            <SubSection title="Get Session" method="GET" endpoint="/sessions/:id">
              <p className="text-sm text-muted-foreground mb-4">
                Get details for a specific session, including transcripts if available.
              </p>
            </SubSection>

            <SubSection title="Start Session" method="POST" endpoint="/sessions">
              <p className="text-sm text-muted-foreground mb-4">
                Start a real-time interaction session with an avatar.
              </p>
              
              <h4 className="font-medium text-sm mb-2">Request Body</h4>
              <CodeBlock language="json">
{`{
  "avatarId": "avatar_id_here",
  "name": "User Session 123" // Optional session name
}`}
              </CodeBlock>

              <h4 className="font-medium text-sm mb-2">Response</h4>
              <CodeBlock language="json">
{`{
  "data": {
    "session": {
      "id": "session_id",
      "url": "wss://...",
      "token": "..."
    }
  }
}`}
              </CodeBlock>
            </SubSection>

            <SubSection title="Stop Session" method="POST" endpoint="/sessions/:id/stop">
              <p className="text-sm text-muted-foreground">
                End an active session immediately.
              </p>
            </SubSection>
          </Section>

          <Section id="errors" title="Errors">
            <p className="text-muted-foreground mb-4">
              The API uses standard HTTP status codes to indicate success or failure.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-3 rounded-lg border border-border/50 bg-card">
                <span className="font-mono text-green-500 font-bold mr-2">200</span>
                <span className="text-sm">Success</span>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-card">
                <span className="font-mono text-green-500 font-bold mr-2">201</span>
                <span className="text-sm">Created</span>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-card">
                <span className="font-mono text-amber-500 font-bold mr-2">400</span>
                <span className="text-sm">Bad Request (Invalid parameters)</span>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-card">
                <span className="font-mono text-red-500 font-bold mr-2">401</span>
                <span className="text-sm">Unauthorized (Invalid API Key)</span>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-card">
                <span className="font-mono text-red-500 font-bold mr-2">403</span>
                <span className="text-sm">Forbidden (Access denied)</span>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-card">
                <span className="font-mono text-red-500 font-bold mr-2">404</span>
                <span className="text-sm">Not Found</span>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-card">
                <span className="font-mono text-red-500 font-bold mr-2">500</span>
                <span className="text-sm">Internal Server Error</span>
              </div>
            </div>
            
            <h4 className="font-medium text-sm mb-2">Error Response Format</h4>
            <CodeBlock language="json">
{`{
  "error": "Description of the error"
}`}
            </CodeBlock>
          </Section>
        </div>
      </div>
    </div>
  )
}
