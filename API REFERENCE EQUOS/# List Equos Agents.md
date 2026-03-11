# List Equos Agents.



## OpenAPI

````yaml https://api.equos.ai/docs/v1-json get /v1/agents
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
  /v1/agents:
    get:
      tags:
        - Agent
      summary: List Equos Agents.
      operationId: AgentController_list_v1
      parameters:
        - name: take
          required: false
          in: query
          schema:
            maximum: 50
            default: 20
            type: number
        - name: skip
          required: false
          in: query
          schema:
            minimum: 0
            default: 0
            type: number
        - name: client
          required: false
          in: query
          schema:
            type: string
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ListEquosAgentsResponse'
      security:
        - x-api-key: []
components:
  schemas:
    ListEquosAgentsResponse:
      type: object
      properties:
        skip:
          type: number
        take:
          type: number
        total:
          type: number
        agents:
          type: array
          items:
            $ref: '#/components/schemas/EquosAgent'
      required:
        - skip
        - take
        - total
        - agents
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