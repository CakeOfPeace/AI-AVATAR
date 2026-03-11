# Get organization limits.



## OpenAPI

````yaml https://api.equos.ai/docs/v1-json get /v1/limits
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
  /v1/limits:
    get:
      tags:
        - Limits
      summary: Get organization limits.
      operationId: LimitsController_limit_v1
      parameters: []
      responses:
        '200':
          description: The organization limits, or null if none set.
          content:
            application/json:
              schema:
                nullable: true
                allOf:
                  - 8ad2338f-f87d-4ea8-8782-1e79c258dd4b
      security:
        - x-api-key: []
components:
  securitySchemes:
    x-api-key:
      type: apiKey
      in: header
      name: x-api-key

````

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.equos.ai/llms.txt