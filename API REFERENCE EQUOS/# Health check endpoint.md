# Health check endpoint



## OpenAPI

````yaml https://api.equos.ai/docs/v1-json get /v1/health
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
  /v1/health:
    get:
      tags:
        - Health
      summary: Health check endpoint
      operationId: HealthController_check_v1
      parameters: []
      responses:
        '200':
          description: The API is ok.
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/HealthResponse'
components:
  schemas:
    HealthResponse:
      type: object
      properties:
        status:
          type: string
          example: ok
        version:
          type: string
          example: 1.0.0
      required:
        - status
        - version

````

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.equos.ai/llms.txt