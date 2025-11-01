# RESTful API Design Best Practices

## Core Principles

### REST Fundamentals

REST (Representational State Transfer) is an architectural style for distributed systems. Key principles:

1. **Client-Server Separation**: Decouple client and server
2. **Stateless**: Each request contains all information needed
3. **Cacheable**: Responses must define themselves as cacheable or not
4. **Uniform Interface**: Consistent resource identification
5. **Layered System**: Client cannot tell if connected directly to end server

## Resource Naming

### Good: Use Nouns, Not Verbs

```
✅ Good:
GET    /users              # Get all users
GET    /users/123          # Get specific user
POST   /users              # Create new user
PUT    /users/123          # Update user
DELETE /users/123          # Delete user

GET    /users/123/posts    # Get user's posts
POST   /users/123/posts    # Create post for user

❌ Bad:
GET    /getUsers
POST   /createUser
GET    /user/delete/123
POST   /users/123/getPosts
```

### Use Plural Nouns

```
✅ Good:
/users
/products
/orders

❌ Bad:
/user
/product
/order
```

### Hierarchical Relationships

```
✅ Good:
/users/123/posts/456/comments
/organizations/abc/teams/xyz/members

❌ Bad:
/getUserPostComments?user=123&post=456
/getOrgTeamMembers?org=abc&team=xyz
```

### Use Hyphens for Readability

```
✅ Good:
/api/user-profiles
/api/order-items
/api/payment-methods

❌ Bad:
/api/userProfiles
/api/user_profiles
/api/OrderItems
```

## HTTP Methods

### Proper HTTP Verb Usage

```
GET    /users           # Retrieve list of users
GET    /users/123       # Retrieve specific user
POST   /users           # Create new user
PUT    /users/123       # Update entire user (all fields)
PATCH  /users/123       # Partial update (specific fields)
DELETE /users/123       # Delete user
HEAD   /users/123       # Check if user exists (no body)
OPTIONS /users          # Get allowed methods
```

### Idempotency

**Idempotent methods** (safe to retry):
- GET, PUT, DELETE, HEAD, OPTIONS

**Non-idempotent methods**:
- POST (creates new resource each time)
- PATCH (may or may not be idempotent)

```javascript
// Idempotent PUT - can be retried safely
PUT /users/123
{
  "name": "John Doe",
  "email": "john@example.com"
}

// Non-idempotent POST - creates new resource
POST /users
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

## HTTP Status Codes

### Success Codes (2xx)

```
200 OK                  # Successful GET, PUT, PATCH, DELETE
201 Created             # Successful POST (resource created)
202 Accepted            # Request accepted for processing (async)
204 No Content          # Successful DELETE (no response body)
206 Partial Content     # Partial GET (range request)
```

### Client Error Codes (4xx)

```
400 Bad Request         # Invalid syntax or validation error
401 Unauthorized        # Authentication required
403 Forbidden           # Authenticated but not authorized
404 Not Found           # Resource doesn't exist
405 Method Not Allowed  # HTTP method not supported
409 Conflict           # Request conflicts with current state
422 Unprocessable Entity # Validation errors
429 Too Many Requests   # Rate limit exceeded
```

### Server Error Codes (5xx)

```
500 Internal Server Error  # Generic server error
502 Bad Gateway           # Invalid response from upstream
503 Service Unavailable   # Temporary overload or maintenance
504 Gateway Timeout       # Upstream timeout
```

### Practical Examples

```javascript
// Success scenarios
GET /users/123
→ 200 OK
{
  "id": "123",
  "name": "John Doe",
  "email": "john@example.com"
}

POST /users
→ 201 Created
Location: /users/456
{
  "id": "456",
  "name": "Jane Doe",
  "email": "jane@example.com"
}

DELETE /users/123
→ 204 No Content

// Error scenarios
GET /users/999
→ 404 Not Found
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User with ID 999 not found"
  }
}

POST /users
{
  "email": "invalid-email"
}
→ 422 Unprocessable Entity
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}

POST /users
(without authentication)
→ 401 Unauthorized
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

## Request/Response Format

### Request Structure

**Good: Clean request body**
```json
POST /api/v1/users
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...

{
  "email": "john@example.com",
  "name": "John Doe",
  "role": "admin",
  "preferences": {
    "newsletter": true,
    "theme": "dark"
  }
}
```

### Response Structure

**Good: Consistent response envelope**
```json
// Success response
{
  "data": {
    "id": "123",
    "email": "john@example.com",
    "name": "John Doe",
    "createdAt": "2025-01-15T10:30:00Z"
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:05Z",
    "requestId": "abc-123-def"
  }
}

// List response with pagination
{
  "data": [
    { "id": "1", "name": "User 1" },
    { "id": "2", "name": "User 2" }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "links": {
    "self": "/api/v1/users?page=1",
    "next": "/api/v1/users?page=2",
    "last": "/api/v1/users?page=8"
  }
}

// Error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_FORMAT"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-01-15T10:30:05Z",
    "requestId": "abc-123-def"
  }
}
```

## Filtering, Sorting, and Pagination

### Filtering

```
✅ Good:
GET /users?role=admin
GET /users?status=active&verified=true
GET /products?category=electronics&price[gte]=100&price[lte]=500
GET /posts?createdAt[gte]=2025-01-01&tags=tech,api

❌ Bad:
GET /users?filter=role:admin
GET /products?q=category:electronics,price:100-500
```

### Sorting

```
✅ Good:
GET /users?sort=name                    # Ascending
GET /users?sort=-createdAt              # Descending (prefix with -)
GET /users?sort=name,-createdAt         # Multiple fields

❌ Bad:
GET /users?sort=name&order=asc
GET /users?sortBy=name&sortOrder=desc
```

### Pagination

**Offset-based pagination:**
```
GET /users?page=2&limit=20
GET /users?offset=20&limit=20

Response:
{
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "links": {
    "first": "/users?page=1&limit=20",
    "prev": "/users?page=1&limit=20",
    "self": "/users?page=2&limit=20",
    "next": "/users?page=3&limit=20",
    "last": "/users?page=8&limit=20"
  }
}
```

**Cursor-based pagination (better for large datasets):**
```
GET /users?cursor=eyJpZCI6MTIzfQ&limit=20

Response:
{
  "data": [...],
  "meta": {
    "hasMore": true,
    "nextCursor": "eyJpZCI6MTQzfQ"
  },
  "links": {
    "next": "/users?cursor=eyJpZCI6MTQzfQ&limit=20"
  }
}
```

### Field Selection (Sparse Fieldsets)

```
✅ Good:
GET /users?fields=id,name,email
GET /users/123?fields=id,name,email,profile.avatar

Response:
{
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com",
    "profile": {
      "avatar": "https://..."
    }
  }
}
```

## Versioning

### URI Versioning (Recommended)

```
✅ Good:
/api/v1/users
/api/v2/users

Pros:
- Clear and explicit
- Easy to route and cache
- Easy to deprecate old versions
```

### Header Versioning

```
GET /api/users
Accept: application/vnd.myapi.v2+json

Pros:
- Clean URLs
- Content negotiation
```

### Query Parameter Versioning

```
❌ Not recommended:
/api/users?version=2

Cons:
- Harder to route
- Can be overlooked
```

## HATEOAS (Hypermedia as the Engine of Application State)

**Good: Include related links**
```json
{
  "data": {
    "id": "123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "links": {
    "self": "/api/v1/users/123",
    "posts": "/api/v1/users/123/posts",
    "friends": "/api/v1/users/123/friends",
    "avatar": "/api/v1/users/123/avatar"
  }
}
```

## Error Handling

### Consistent Error Format

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "User with ID 123 not found",
    "details": null,
    "timestamp": "2025-01-15T10:30:00Z",
    "path": "/api/v1/users/123",
    "requestId": "abc-123-def"
  }
}
```

### Validation Errors

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required",
        "code": "REQUIRED_FIELD"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters",
        "code": "MIN_LENGTH",
        "constraint": 8
      }
    ]
  }
}
```

### Error Codes

**Use meaningful error codes:**
```
RESOURCE_NOT_FOUND
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
DUPLICATE_RESOURCE
RATE_LIMIT_EXCEEDED
INTERNAL_SERVER_ERROR
SERVICE_UNAVAILABLE
```

## Authentication & Authorization

### Bearer Token (JWT)

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

✅ Pros:
- Stateless
- Can include claims
- Works across domains
```

### API Keys

```
X-API-Key: your-api-key-here

✅ Use cases:
- Server-to-server communication
- Third-party integrations
- Rate limiting
```

### OAuth 2.0

```
Authorization: Bearer {access_token}

✅ Use cases:
- Third-party app access
- Social login
- Delegated access
```

## Rate Limiting

### Rate Limit Headers

```
GET /api/v1/users

Response Headers:
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642252800

When exceeded:
HTTP/1.1 429 Too Many Requests
Retry-After: 3600

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 minutes",
    "retryAfter": 3600
  }
}
```

### Rate Limiting Strategies

```
Per IP:          100 requests/minute
Per User:        1000 requests/hour
Per API Key:     10000 requests/day
```

## Caching

### Cache Headers

```
✅ Good caching headers:

GET /api/v1/users/123

Response:
Cache-Control: max-age=3600, private
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Wed, 15 Jan 2025 10:00:00 GMT
Vary: Accept, Authorization

Conditional requests:
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"
If-Modified-Since: Wed, 15 Jan 2025 10:00:00 GMT

Response if not modified:
304 Not Modified
```

### Cache Control Directives

```
Cache-Control: public           # Can be cached by anyone
Cache-Control: private          # Only user's browser can cache
Cache-Control: no-cache         # Must revalidate before use
Cache-Control: no-store         # Don't cache at all
Cache-Control: max-age=3600     # Cache for 1 hour
```

## Bulk Operations

### Batch Requests

```
POST /api/v1/batch

{
  "operations": [
    {
      "method": "POST",
      "path": "/users",
      "body": { "name": "User 1" }
    },
    {
      "method": "PUT",
      "path": "/users/123",
      "body": { "name": "Updated User" }
    },
    {
      "method": "DELETE",
      "path": "/users/456"
    }
  ]
}

Response:
{
  "results": [
    {
      "status": 201,
      "body": { "id": "789", "name": "User 1" }
    },
    {
      "status": 200,
      "body": { "id": "123", "name": "Updated User" }
    },
    {
      "status": 204
    }
  ]
}
```

## Long-Running Operations

### Async Processing Pattern

```
POST /api/v1/reports/generate
{
  "type": "sales",
  "period": "2024-Q4"
}

Response:
202 Accepted
Location: /api/v1/jobs/abc-123

{
  "jobId": "abc-123",
  "status": "processing",
  "createdAt": "2025-01-15T10:30:00Z",
  "statusUrl": "/api/v1/jobs/abc-123"
}

GET /api/v1/jobs/abc-123

Response (while processing):
{
  "jobId": "abc-123",
  "status": "processing",
  "progress": 45,
  "message": "Generating report..."
}

Response (when complete):
{
  "jobId": "abc-123",
  "status": "completed",
  "result": {
    "reportUrl": "/api/v1/reports/abc-123.pdf"
  }
}
```

## Webhooks

### Design Pattern

```json
POST https://client.example.com/webhooks

Headers:
X-Webhook-Signature: sha256=...
X-Webhook-Event: user.created
X-Webhook-Delivery: abc-123

Body:
{
  "event": "user.created",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "id": "123",
    "email": "john@example.com",
    "name": "John Doe"
  }
}

Response from client:
200 OK (acknowledged)
```

### Webhook Security

```javascript
// Verify webhook signature
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(digest)
  );
}
```

## Documentation

### OpenAPI/Swagger Example

```yaml
openapi: 3.0.0
info:
  title: User API
  version: 1.0.0
  description: User management API

paths:
  /users:
    get:
      summary: Get all users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'
    
    post:
      summary: Create user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '422':
          description: Validation error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'

components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
        name:
          type: string
        createdAt:
          type: string
          format: date-time
```

## Best Practices Checklist

### API Design
- [ ] Use nouns for resources, not verbs
- [ ] Use plural nouns for collections
- [ ] Use hyphens for multi-word resources
- [ ] Implement proper HTTP methods
- [ ] Use correct HTTP status codes
- [ ] Version your API
- [ ] Include pagination for lists
- [ ] Support filtering and sorting
- [ ] Implement field selection
- [ ] Include HATEOAS links

### Security
- [ ] Use HTTPS everywhere
- [ ] Implement authentication
- [ ] Implement authorization
- [ ] Validate all inputs
- [ ] Use rate limiting
- [ ] Implement CORS properly
- [ ] Add security headers
- [ ] Sanitize user input
- [ ] Use parameterized queries

### Performance
- [ ] Implement caching
- [ ] Use compression
- [ ] Implement pagination
- [ ] Optimize database queries
- [ ] Use CDN for static assets
- [ ] Implement async processing for heavy tasks

### Error Handling
- [ ] Use consistent error format
- [ ] Include error codes
- [ ] Provide helpful error messages
- [ ] Log errors server-side
- [ ] Don't expose sensitive information

### Documentation
- [ ] Document all endpoints
- [ ] Provide examples
- [ ] Document error responses
- [ ] Keep documentation up-to-date
- [ ] Use OpenAPI/Swagger

## Anti-Patterns to Avoid

### ❌ Don't Mix Plural and Singular

```
❌ Bad:
/user/123
/users

✅ Good:
/users/123
/users
```

### ❌ Don't Use Verbs in URLs

```
❌ Bad:
POST /createUser
GET /getUser/123

✅ Good:
POST /users
GET /users/123
```

### ❌ Don't Return Array as Root

```
❌ Bad:
GET /users
[
  { "id": 1, "name": "John" },
  { "id": 2, "name": "Jane" }
]

✅ Good:
{
  "data": [
    { "id": 1, "name": "John" },
    { "id": 2, "name": "Jane" }
  ]
}
```

### ❌ Don't Use Query Params for Filtering Complex Data

```
❌ Bad:
GET /users?filter={"age":{"gt":18},"status":"active"}

✅ Good:
POST /users/search
{
  "filters": {
    "age": { "gt": 18 },
    "status": "active"
  }
}
```

## Resources

- [REST API Tutorial](https://restfulapi.net/)
- [HTTP Status Codes](https://httpstatuses.com/)
- [OpenAPI Specification](https://swagger.io/specification/)
- [JSON:API](https://jsonapi.org/)
- [Google API Design Guide](https://cloud.google.com/apis/design)