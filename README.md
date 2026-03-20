# TaskFlow — Real-time Collaborative Task Manager

A full-stack, real-time collaborative task management application built with a modern, scalable architecture.

---

## 🏗️ Backend Architecture

### Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js ≥ 18 |
| **Framework** | Fastify v4 |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth (JWT) |
| **Cache / Queue** | Redis (ioredis) + Bull |
| **Real-time** | Socket.IO + `@fastify/websocket` |
| **File Storage** | AWS S3 |
| **Email** | AWS SES |
| **Validation** | Joi · Zod |
| **Logging** | Pino + pino-pretty |
| **Testing** | Jest + Supertest |

---

### Directory Structure

```
backend/
├── src/
│   ├── config/           # Service clients & env validation
│   │   ├── env.js        # Typed environment config (validated on startup)
│   │   ├── supabase.js   # Supabase anon + admin clients, JWT helpers
│   │   └── redis.js      # ioredis connection
│   │
│   ├── controllers/      # Route handler functions (thin layer — delegates to services)
│   ├── services/         # Business logic layer
│   ├── repositories/     # Database query layer (PostgreSQL via pg pool)
│   ├── models/           # Schema definitions, migrations & seed scripts
│   │   ├── migrate.js    # Run: npm run db:migrate
│   │   └── seed.js       # Run: npm run db:seed
│   │
│   ├── routes/           # Fastify route registrations
│   ├── middlewares/      # Auth guards, error handlers, request parsers
│   ├── validators/       # Joi / Zod request validation schemas
│   ├── websocket/        # Socket.IO event handlers & room management
│   ├── jobs/             # Bull queue job definitions & processors
│   ├── utils/            # Shared utilities
│   │   ├── apiResponse.js # Standardised success / error / paginated helpers
│   │   └── logger.js      # Pino logger instance
│   ├── constants/        # App-wide constant values & enums
│   └── types/            # JSDoc / type definitions
│
├── tests/                # Jest integration & unit tests
├── .env.example          # Environment variable template
├── .gitignore
└── package.json
```

---

### Request / Response Flow

```
Client Request
     │
     ▼
Fastify HTTP Server (port 5000)
     │
     ├─► @fastify/helmet      (security headers)
     ├─► @fastify/cors        (CORS policy)
     ├─► @fastify/rate-limit  (100 req / 60s default)
     │
     ▼
Route Handler
     │
     ├─► Middleware (auth guard — verifies Supabase JWT)
     ├─► Validator  (Joi / Zod schema check)
     │
     ▼
Controller  →  Service  →  Repository  →  PostgreSQL (Supabase)
                   │
                   ├──► Redis (caching / session)
                   ├──► AWS S3 (file uploads via presigned URLs)
                   └──► AWS SES (transactional email)
     │
     ▼
Standardised JSON Response
{ success, message, data, timestamp }
```

---

### Real-time Architecture

WebSocket connections are handled by **Socket.IO** (with a `@fastify/websocket` fallback):

```
Client  ──WS──►  Socket.IO Server
                      │
                      ├─► Auth middleware (verify JWT on handshake)
                      ├─► Room management  (project / task rooms)
                      └─► Event broadcast  (task updates, comments, presence)
```

Background jobs (email dispatch, file processing, notifications) run through **Bull** queues backed by Redis.

---

### Authentication

- **Provider**: Supabase Auth (email/password, OAuth, magic-link)
- **Tokens**: Supabase JWTs — verified server-side with `supabase.auth.getUser(token)`
- **Admin ops**: Service-role client (`supabaseAdmin`) used for invite/delete operations — bypasses Row Level Security (RLS)
- **Custom JWT**: `jsonwebtoken` available for any supplemental token needs

---

### Key NPM Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with nodemon hot-reload |
| `npm start` | Start production server |
| `npm test` | Run Jest test suite |
| `npm run lint` | ESLint source files |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed the database with initial data |

---

### Environment Variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
|---|---|
| `PORT` | Server port (default `5000`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `DATABASE_URL` | Direct PostgreSQL connection string |
| `REDIS_URL` | Redis connection URL |
| `AWS_ACCESS_KEY_ID` | AWS credentials for S3 & SES |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials for S3 & SES |
| `S3_BUCKET_NAME` | S3 bucket for file uploads |
| `SES_FROM_EMAIL` | Sender address for transactional emails |
| `JWT_SECRET` | Secret for custom JWT signing (min 32 chars) |
| `ALLOWED_ORIGINS` | Comma-separated CORS allowed origins |
| `MAX_FILE_SIZE_MB` | Maximum upload file size (default `10`) |

> **Never commit `.env` to version control.** Use `.env.example` as the reference template.

---

### API Response Format

All endpoints return a consistent JSON envelope:

```json
// Success
{
  "success": true,
  "message": "Task created successfully",
  "data": { ... },
  "timestamp": "2026-03-20T07:30:00.000Z"
}

// Error
{
  "success": false,
  "message": "Unauthorized",
  "errors": null,
  "timestamp": "2026-03-20T07:30:00.000Z"
}

// Paginated
{
  "success": true,
  "message": "Success",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "timestamp": "2026-03-20T07:30:00.000Z"
}
```

---

### Security Highlights

- **Helmet** — sets secure HTTP headers on every response
- **CORS** — strict origin allowlist via `ALLOWED_ORIGINS`
- **Rate limiting** — 100 requests per 60-second window (configurable)
- **File uploads** — type & size validation before S3 upload (`@fastify/multipart`)
- **RLS** — Supabase Row Level Security enforced at the database layer
- **Secrets** — all credentials sourced from environment variables, never hardcoded
