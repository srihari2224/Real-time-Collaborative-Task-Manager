# TaskFlow — Real-time Collaborative Task Manager

A full-stack, real-time collaborative task management application built with a modern, scalable architecture.

## 🌐 Live Demo

[![Live Demo](https://img.shields.io/badge/Live-Demo-green?style=for-the-badge)](https://taskify-ashen-chi.vercel.app/)

---

## 🚀 Local Development Setup

Follow these steps to clone the repo and run both the **backend** and **frontend** on your machine.

### 1. Prerequisites

Make sure the following tools are installed before you begin:

| Tool | Version | Download |
|---|---|---|
| **Node.js** | ≥ 18.x | [nodejs.org](https://nodejs.org) |
| **npm** | ≥ 9.x (comes with Node) | — |
| **Git** | any recent | [git-scm.com](https://git-scm.com) |
| **Redis** | ≥ 6.x | [redis.io](https://redis.io/docs/getting-started/) — or use [Upstash](https://upstash.com) (free cloud Redis) |
| **PostgreSQL** | via Supabase | Create a free project at [supabase.com](https://supabase.com) |

> **Windows users:** To run Redis locally on Windows, the easiest option is to use [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install) or the [Memurai](https://www.memurai.com/) Redis-compatible service. Alternatively, use a free cloud Redis from [Upstash](https://upstash.com).

---

### 2. Clone the Repository

```bash
git clone https://github.com/srihari2224/Real-time-Collaborative-Task-Manager.git
cd Real-time-Collaborative-Task-Manager
```

---

### 3. Set Up the Backend

#### 3a. Install dependencies

```bash
cd backend
npm install
```

#### 3b. Configure environment variables

Copy the example file and fill in your own values:

```bash
# On Mac/Linux:
cp .env.example .env

# On Windows (cmd):
copy .env.example .env

# On Windows (PowerShell):
Copy-Item .env.example .env
```

Open `.env` in any text editor and fill in the required values:

| Variable | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API |
| `DATABASE_URL` | Supabase dashboard → Project Settings → Database → Connection string |
| `REDIS_URL` | `redis://localhost:6379` for local Redis, or your Upstash URL |
| `JWT_SECRET` | Any random string ≥ 32 characters |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS IAM (needed only for file uploads & emails) |
| `S3_BUCKET_NAME` | Your S3 bucket name (optional for basic dev) |
| `SES_FROM_EMAIL` | Verified SES sender email (optional for basic dev) |
| `ALLOWED_ORIGINS` | `http://localhost:3000` |

> **Tip:** For basic local development you only **need** the Supabase, Redis, and JWT variables. AWS S3/SES are only required for file upload and email features.

#### 3c. Run database migrations

```bash
npm run db:migrate
```

Optionally seed the database with sample data:

```bash
npm run db:seed
```

#### 3d. Start the backend dev server

```bash
npm run dev
```

The API will be running at **http://localhost:5000**

---

### 4. Set Up the Frontend

Open a **new terminal** for the frontend (keep the backend running).

#### 4a. Install dependencies

```bash
cd frontend
npm install
```

#### 4b. Configure environment variables

```bash
# On Mac/Linux:
cp .env.local.example .env.local

# On Windows (cmd):
copy .env.local.example .env.local

# On Windows (PowerShell):
Copy-Item .env.local.example .env.local
```

Open `.env.local` and fill in:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:5000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as backend `SUPABASE_URL` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as backend `SUPABASE_ANON_KEY` |

#### 4c. Start the frontend dev server

```bash
npm run dev
```

The app will be running at **http://localhost:3000**

---

### 5. Quick-Start Checklist

```
[ ] Node.js ≥ 18 installed
[ ] Redis running (local or cloud)
[ ] Supabase project created
[ ] backend/.env filled in
[ ] npm install done inside /backend
[ ] npm run db:migrate run
[ ] npm run dev started in /backend  →  http://localhost:5000
[ ] frontend/.env.local filled in
[ ] npm install done inside /frontend
[ ] npm run dev started in /frontend  →  http://localhost:3000
```

---

### 6. Useful Scripts

**Backend**

| Script | Description |
|---|---|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start production server |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed sample data |
| `npm test` | Run Jest test suite |
| `npm run lint` | Lint TypeScript source |

**Frontend**

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Build production bundle |
| `npm start` | Start production server |
| `npm run lint` | Lint source files |

---

### 7. Project Structure Overview

```
Real-time-Collaborative-Task-Manager/
├── backend/          # Fastify + TypeScript API server
│   ├── src/
│   ├── .env.example  # ← copy to .env
│   └── package.json
└── frontend/         # Next.js 16 + TailwindCSS app
    ├── src/
    ├── .env.local.example  # ← copy to .env.local
    └── package.json
```

---


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
