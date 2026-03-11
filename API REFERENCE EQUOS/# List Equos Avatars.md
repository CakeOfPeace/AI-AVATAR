# List Equos Avatars.



## OpenAPI

````yaml https://api.equos.ai/docs/v1-json get /v1/avatars
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
  /v1/avatars:
    get:
      tags:
        - Avatar
      summary: List Equos Avatars.
      operationId: AvatarController_list_v1
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
                $ref: '#/components/schemas/ListEquosAvatarsResponse'
      security:
        - x-api-key: []
components:
  schemas:
    ListEquosAvatarsResponse:
      type: object
      properties:
        skip:
          type: number
        take:
          type: number
        total:
          type: number
        avatars:
          type: array
          items:
            $ref: '#/components/schemas/EquosAvatar'
      required:
        - skip
        - take
        - total
        - avatars
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
  securitySchemes:
    x-api-key:
      type: apiKey
      in: header
      name: x-api-key

````

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.equos.ai/llms.txt