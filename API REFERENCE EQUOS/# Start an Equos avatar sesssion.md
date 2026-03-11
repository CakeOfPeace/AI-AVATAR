# Start an Equos avatar sesssion.



## OpenAPI

````yaml https://api.equos.ai/docs/v1-json post /v1/sessions
openapi: 3.0.0
info:
  title: Equos.ai API
  description: API documentation for Equos.ai live platform.
  version: '1.0'
  contact: {}
servers:
  - url: https://api.equos.ai
security: []
tags: []
paths:
  /v1/sessions:
    post:
      tags:
        - Sessions
      summary: Start an Equos avatar sesssion.
      operationId: SessionsController_create_v1
      parameters: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateEquosSessionRequest'
      responses:
        '201':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CreateEquosSessionResponse'
      security:
        - x-api-key: []
components:
  schemas:
    CreateEquosSessionRequest:
      type: object
      properties:
        name:
          type: string
        client:
          type: string
          description: User-side client identifier.
        host:
          description: '[Optional] Host configuration for self-hosted livekit sessions.'
          allOf:
            - $ref: '#/components/schemas/EquosSessionHost'
        maxDuration:
          type: number
          description: >-
            [Optional] Max session duration in seconds. Must be less than
            organization limit.
        additionalCtx:
          type: string
        templateVars:
          type: object
        agent:
          description: >-
            [Optional] Either provide an existing agent ID or create a new agent
            on the fly.
          oneOf:
            - $ref: '#/components/schemas/CreateEquosAgentRequest'
            - $ref: '#/components/schemas/EquosResourceReference'
        avatar:
          description: >-
            Either provide an existing avatar ID or create a new avatar on the
            fly.
          oneOf:
            - $ref: '#/components/schemas/CreateEquosAvatarRequest'
            - $ref: '#/components/schemas/EquosResourceReference'
        remoteAgentConnectingIdentity:
          description: >-
            [Optional] Identity of the agent that will forward audio to your
            Equos Avatar. Required for self-hosted agents.
          allOf:
            - $ref: '#/components/schemas/EquosParticipantIdentity'
        consumerIdentity:
          description: >-
            [Optional] Identity of the end user that will interact with the
            agent in the session. Required if not self-hosted session.
          allOf:
            - $ref: '#/components/schemas/EquosParticipantIdentity'
      required:
        - name
        - avatar
    CreateEquosSessionResponse:
      type: object
      properties:
        session:
          $ref: '#/components/schemas/EquosSession'
        consumerAccessToken:
          type: string
        remoteAgentAccessToken:
          type: string
      required:
        - session
    EquosSessionHost:
      type: object
      properties:
        serverUrl:
          type: string
          description: The URL of the LiveKit server.
        accessToken:
          type: string
          description: The access token for the avatar to join the room.
      required:
        - serverUrl
        - accessToken
    CreateEquosAgentRequest:
      type: object
      properties:
        name:
          type: string
          maxLength: 64
        client:
          type: object
          maxLength: 64
          nullable: true
        provider:
          type: string
          enum:
            - openai
            - gemini
            - elevenlabs
        model:
          type: string
          enum:
            - gemini-2.5-flash-native-audio-preview-09-2025
        voice:
          type: string
          enum:
            - Puck
            - Charon
            - Kore
            - Fenrir
            - Aoede
            - Leda
            - Orus
            - Zephyr
            - Sulafat
            - Sadachbia
            - Sadaltager
            - Vindemiatrix
            - Zubenelgenubi
            - Achird
            - Pulcherrima
            - Gacrux
            - Schedar
            - Alnilam
            - Achernar
            - Laomedeia
            - Rasalgethi
            - Algenib
            - Erinome
            - Despina
            - Algieba
            - Umbriel
            - Iapetus
            - Enceladus
            - Autonoe
            - Callirrhoe
        instructions:
          type: string
        greetingMsg:
          type: string
        remoteId:
          type: string
        search:
          type: boolean
        emotions:
          type: boolean
        memory:
          type: boolean
      required:
        - provider
    EquosResourceReference:
      type: object
      properties:
        id:
          type: string
      required:
        - id
    CreateEquosAvatarRequest:
      type: object
      properties:
        identity:
          type: string
          description: Livekit identity of the avatar.
        name:
          type: string
        refImage:
          type: string
          description: Base64 data URL of the reference image.
        agentId:
          type: object
          description: Optional agent ID to link with the avatar.
        client:
          type: object
          maxLength: 64
      required:
        - identity
        - name
        - refImage
        - agentId
    EquosParticipantIdentity:
      type: object
      properties:
        identity:
          type: string
        name:
          type: string
      required:
        - identity
        - name
    EquosSession:
      type: object
      properties:
        id:
          type: string
        organizationId:
          type: string
        freemium:
          type: boolean
        name:
          type: string
        provider:
          type: string
        client:
          type: string
        status:
          type: string
        maxDuration:
          type: number
        additionalCtx:
          type: string
        templateVars:
          type: object
        host:
          $ref: '#/components/schemas/EquosSessionServer'
        avatarId:
          type: string
        avatar:
          $ref: '#/components/schemas/EquosAvatar'
        agentId:
          type: string
        agent:
          nullable: true
          allOf:
            - $ref: '#/components/schemas/EquosAgent'
        remoteAgentIdentity:
          type: object
        transcript:
          type: object
          nullable: true
        startedAt:
          format: date-time
          type: string
        endedAt:
          format: date-time
          type: string
        createdAt:
          format: date-time
          type: string
        updatedAt:
          format: date-time
          type: string
      required:
        - id
        - organizationId
        - freemium
        - name
        - provider
        - status
        - host
        - avatar
        - startedAt
        - createdAt
        - updatedAt
    EquosSessionServer:
      type: object
      properties:
        serverUrl:
          type: string
          description: The URL of the LiveKit server.
      required:
        - serverUrl
    EquosAvatar:
      type: object
      properties:
        id:
          type: string
        organizationId:
          type: string
        identity:
          type: string
        name:
          type: string
        description:
          type: string
        client:
          type: string
        thumbnailUrl:
          type: string
        agentId:
          type: object
        agent:
          type: object
        createdAt:
          format: date-time
          type: string
        updatedAt:
          format: date-time
          type: string
      required:
        - id
        - organizationId
        - identity
        - name
        - description
        - thumbnailUrl
        - createdAt
        - updatedAt
    EquosAgent:
      type: object
      properties:
        id:
          type: string
        organizationId:
          type: string
        name:
          type: string
        provider:
          type: string
          enum:
            - openai
            - gemini
            - elevenlabs
        client:
          type: string
        model:
          type: string
          enum:
            - gemini-2.5-flash-native-audio-preview-09-2025
            - gpt-4o-realtime-preview
            - gpt-realtime
        voice:
          type: string
          enum:
            - Puck
            - Charon
            - Kore
            - Fenrir
            - Aoede
            - Leda
            - Orus
            - Zephyr
            - Sulafat
            - Sadachbia
            - Sadaltager
            - Vindemiatrix
            - Zubenelgenubi
            - Achird
            - Pulcherrima
            - Gacrux
            - Schedar
            - Alnilam
            - Achernar
            - Laomedeia
            - Rasalgethi
            - Algenib
            - Erinome
            - Despina
            - Algieba
            - Umbriel
            - Iapetus
            - Enceladus
            - Autonoe
            - Callirrhoe
            - alloy
            - marin
            - cedar
            - ash
            - ballad
            - coral
            - echo
            - sage
            - shimmer
            - verse
        instructions:
          type: string
        greetingMsg:
          type: string
        remoteId:
          type: string
        search:
          type: boolean
        emotions:
          type: boolean
        memory:
          type: boolean
        createdAt:
          format: date-time
          type: string
        updatedAt:
          format: date-time
          type: string
      required:
        - id
        - organizationId
        - provider
        - search
        - emotions
        - memory
        - createdAt
        - updatedAt
  securitySchemes:
    x-api-key:
      type: apiKey
      in: header
      name: x-api-key

````

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.equos.ai/llms.txt