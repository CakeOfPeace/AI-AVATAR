# Update an Equos Avatar.



## OpenAPI

````yaml https://api.equos.ai/docs/v1-json put /v1/avatars/{id}
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
  /v1/avatars/{id}:
    put:
      tags:
        - Avatar
      summary: Update an Equos Avatar.
      operationId: AvatarController_update_v1
      parameters:
        - name: id
          required: true
          in: path
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UpdateEquosAvatarRequest'
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/EquosAvatar'
      security:
        - x-api-key: []
components:
  schemas:
    UpdateEquosAvatarRequest:
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
        id:
          type: string
        organizationId:
          type: string
      required:
        - identity
        - name
        - refImage
        - agentId
        - id
        - organizationId
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