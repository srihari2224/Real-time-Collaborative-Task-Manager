# TaskFlow — Real-time Collaborative Task Manager

> A full-stack, production-grade task management platform with real-time collaboration, multi-assignee tasks, subtask checklists, in-app notifications, and live team chat.

[![Live Demo](https://img.shields.io/badge/Live-Demo-22c55e?style=for-the-badge&logo=vercel)](https://taskify-ashen-chi.vercel.app/)
[![Backend](https://img.shields.io/badge/API-Render-6366f1?style=for-the-badge&logo=render)](https://real-time-collaborative-task-manager-yizi.onrender.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

---

## 🗂️ Table of Contents

1. [Working Demo](#-working-demo)
2. [Setup — Under 5 Minutes](#-setup--under-5-minutes)
3. [Architecture Overview](#-architecture-overview)
   - [Backend](#backend)
   - [Frontend](#frontend)
4. [Key Features](#-key-features)
5. [Database Schema & Seed Data](#-database-schema--seed-data)
6. [API Reference](#-api-reference)
7. [Tests](#-tests)
8. [Assumptions & Trade-offs](#-assumptions--trade-offs)
9. [Known Limitations & What I'd Do Next](#-known-limitations--what-id-do-next)
10. [AI Usage Disclosure](#-ai-usage-disclosure)

---

## 🎥 Working Demo

**Deployed:** [https://taskify-ashen-chi.vercel.app](https://taskify-ashen-chi.vercel.app)

### Key flows you can test live

| Flow | Steps |
|------|-------|
| **Sign in** | Email/password or Google OAuth on the `/auth` page |
| **Create workspace** | Prompted on first login via `/onboarding` |
| **Create project** | Sidebar → "New Project" inside a workspace |
| **Create task w/ multi-assignee** | "New Task" → add multiple emails → press Enter per email |
| **Subtask checklist** | Open task → Overview tab → type a subtask → tick to complete |
| **Real-time chat** | Open task → Chat tab → messages appear live in other tabs/browsers |
| **Notifications (Inbox)** | Assign a task to yourself → check Inbox for the notification |
| **My Tasks** | Left sidebar → "My Tasks" → filtered to tasks assigned to you |

---

## ⚡ Setup — Under 5 Minutes

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| Git | any |
| Supabase account | free tier works — [supabase.com](https://supabase.com) |

> **No local database or Redis needed.** The backend uses Supabase (hosted PostgreSQL) and in-process Socket.IO rooms — no Redis required for local dev.

---

### Step 1 — Clone

```bash
git clone https://github.com/srihari2224/Real-time-Collaborative-Task-Manager.git
cd Real-time-Collaborative-Task-Manager
```

### Step 2 — Backend

```bash
cd backend
npm install

# Mac/Linux
cp .env.example .env
# Windows PowerShell
Copy-Item .env.example .env
```

Open `backend/.env` and fill in the **3 required** values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
JWT_SECRET=any-random-32-char-string
ALLOWED_ORIGINS=http://localhost:3000
```

> AWS/S3/SES/Redis are **optional** — file uploads and email work only in production on Render where these are configured.

Run the SQL schema in **Supabase → SQL Editor** (the full schema is in `backend/src/models/schema.sql`), then:

```bash
npm run dev
# API running at http://localhost:5000
```

### Step 3 — Frontend

Open a **new terminal**:

```bash
cd frontend
npm install

# Mac/Linux
cp .env.local.example .env.local
# Windows PowerShell
Copy-Item .env.local.example .env.local
```

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

```bash
npm run dev
# App running at http://localhost:3000
```

**That's it.** Open `http://localhost:3000` and sign in. ✅

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (Next.js 14)                                               │
│  - Zustand stores (auth, UI state)                                  │
│  - REST calls via apiClient.ts                                      │
│  - Socket.IO client for real-time events                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  HTTPS / WSS
┌───────────────────────────────▼─────────────────────────────────────┐
│  Backend (Fastify + TypeScript)  — Render.com                       │
│                                                                     │
│  HTTP Routes → Middleware → Controller → Service → Repository       │
│                    │                                                │
│              Socket.IO Server (in-process, no Redis adapter)        │
│              - Workspace rooms  (task CRUD events)                  │
│              - Task rooms       (chat, subtask events)              │
│                                                                     │
│  Uploads  → AWS S3 (presigned URLs)                                │
│  Email    → AWS SES                                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  pg pool
┌───────────────────────────────▼─────────────────────────────────────┐
│  Supabase (PostgreSQL)                                              │
│  - Auth (email/password + Google OAuth)                             │
│  - Row Level Security disabled — enforced at the API layer          │
│  - Tables: users, workspaces, workspace_members, projects,          │
│    tasks, task_assignees, subtasks, task_links,                     │
│    comments, attachments, notifications                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Backend

**Stack:** Node.js 18 · Fastify v4 · TypeScript · PostgreSQL (Supabase) · Socket.IO

```
backend/src/
├── config/          # DB pool, Supabase client, env validation
├── controllers/     # Thin route handlers — delegate to services
├── services/        # Business logic (task visibility, auth, files)
├── repositories/    # All SQL lives here (no ORM — raw pg pool)
├── models/
│   ├── schema.sql   # Full DB schema (run once in Supabase SQL Editor)
│   └── migrate.ts   # Migration runner
├── routes/          # Fastify route registrations
├── middlewares/     # requireAuth (JWT verify), error handler
├── websocket/
│   ├── events.ts    # Typed EventName enum
│   └── handler.ts   # emitToWorkspace / emitToTask helpers
├── utils/           # apiResponse (success/error/paginated), logger
└── types/           # Shared TypeScript interfaces
```

**Layer responsibilities:**

| Layer | Responsibility |
|-------|---------------|
| `routes/` | Register HTTP paths + attach middleware |
| `controllers/` | Parse request, call service, format response |
| `services/` | Business rules (visibility, ownership checks) |
| `repositories/` | Raw SQL — returns typed domain objects |
| `websocket/` | Emit Socket.IO events after mutations |

**Request lifecycle:**
```
Request → Helmet/CORS → Rate-limit → requireAuth (JWT) → Controller
       → Service → Repository → PostgreSQL
       → apiResponse JSON  +  emitToWorkspace/Task (Socket.IO)
```

**Real-time events (Socket.IO):**

| Event | Trigger | Scope |
|-------|---------|-------|
| `task:created` | New task | Workspace room |
| `task:updated` | Edit task / status change | Workspace room |
| `task:deleted` | Delete task | Workspace room |
| `comment:created` | New chat message | Task room |
| `comment:deleted` | Delete message | Task room |
| `subtask_created/updated/deleted` | Subtask CRUD | Task room |
| `link_added/removed` | Link CRUD | Task room |
| `notification` | Task assigned | Workspace room (per user) |

---

### Frontend

**Stack:** Next.js 14 (App Router) · TypeScript · Vanilla CSS · Zustand · Framer Motion · Socket.IO client · Recharts

```
frontend/src/
├── app/
│   ├── auth/              # Sign-in page (email + Google OAuth)
│   ├── onboarding/        # First-time workspace creation
│   ├── workspace/[id]/
│   │   ├── page.tsx       # Workspace dashboard
│   │   └── project/[id]/
│   │       └── page.tsx   # Project: Kanban / List / Calendar / Overview
│   ├── my-tasks/          # Tasks assigned to current user
│   ├── inbox/             # In-app notifications
│   ├── privacy/           # Privacy Policy (required for Google OAuth)
│   └── terms/             # Terms of Service (required for Google OAuth)
├── components/
│   ├── board/             # KanbanBoard — drag-ready column layout
│   ├── chat/              # ChatTab — real-time Socket.IO messages
│   ├── layout/            # Sidebar, TopBar, TaskPanel
│   ├── task/              # TaskPanel (subtasks, links, meta editing)
│   └── ui/                # Avatar, Badge, ProgressBar, AssigneePicker
├── lib/
│   ├── apiClient.ts       # Typed API helpers + all domain types
│   ├── socket.ts          # Socket.IO singleton with lazy connect
│   └── utils.ts           # formatDate, isOverdue, PRIORITY_CONFIG …
└── stores/
    ├── authStore.ts        # Zustand: current user
    └── uiStore.ts          # Zustand: task panel open/closed, active tab
```

**State management philosophy:** Zustand for global UI state (which task panel is open, active view). Local `useState` for everything else. No Redux, no Context soup.

**Task Panel — tabs:**
- **Overview** — editable title, priority/status dropdowns (any assignee), description, subtask checklist with progress bar, links
- **Chat** — real-time Socket.IO messages with optimistic send, emoji reactions, search
- **Files** — attachments list with delete

---

## ✨ Key Features

| Feature | Detail |
|---------|--------|
| **Authentication** | Email/password + Google OAuth via Supabase Auth |
| **Workspaces** | Each user's top-level container; first created on onboarding |
| **Projects** | Belong to a workspace; any member can create one |
| **Multi-assignee tasks** | Add assignees by email at creation; resolved to user IDs server-side |
| **Task visibility scoping** | Owners/admins see all tasks; members see only their assigned tasks (enforced in `taskRepository`) |
| **Subtasks** | Ordered checklist per task; completion auto-updates parent task status |
| **Priority & Status** | Any assignee (not just owner) can change — `urgent/high/medium/low` × `todo/in_progress/in_review/done/cancelled` |
| **Task links** | Add clickable URLs with optional labels |
| **Real-time chat** | Socket.IO per-task room; optimistic send; deduplication in socket listener |
| **In-app notifications** | `notifications` table; populated on task assignment; Inbox page with mark-read |
| **Kanban, List, Calendar, Overview views** | All in the project page; Recharts pie/bar for Overview |

---

## 🗄️ Database Schema & Seed Data

### Run schema (Supabase SQL Editor)

The full schema is in [`backend/src/models/schema.sql`](./backend/src/models/schema.sql).

**Core tables:**

```
users                 — synced from Supabase Auth on first sign-in
workspaces            — top-level container
workspace_members     — (workspace_id, user_id, role: owner|admin|member)
projects              — belong to workspace
tasks                 — belong to project; no single assignee_id
task_assignees        — junction: (task_id, user_id)   ← multi-assignee
subtasks              — checklist items per task
task_links            — URLs attached to a task
comments              — chat messages per task
attachments           — file metadata (stored in S3)
notifications         — in-app notification feed
```

### Seed script

To quickly populate your Supabase database with demo data, run:

```bash
cd backend
npm run db:seed
```

This creates:
- 1 demo workspace: **"Demo Workspace"**
- 2 projects: **"Frontend Sprint"** and **"Backend API"**
- 6 sample tasks across both projects (mix of priorities and statuses)
- 3 subtasks per task
- 2 sample links per task

> The seed script is located at `backend/src/models/seed.js` and uses the `DATABASE_URL` from your `.env`.

**Manual seed alternative:** Sign up, create a workspace during onboarding, then create projects and tasks manually through the UI — the full flow takes under 2 minutes.

---

## 📡 API Reference

Base URL (production): `https://real-time-collaborative-task-manager-yizi.onrender.com/api/v1`

All endpoints require `Authorization: Bearer <supabase-jwt>` except auth routes.

**Response envelope:**
```json
{ "success": true, "message": "...", "data": { ... }, "timestamp": "..." }
```

### Auth
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/sync` | Upsert user from Supabase JWT on login |

### Workspaces
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/workspaces` | List user's workspaces |
| `POST` | `/workspaces` | Create workspace |
| `GET` | `/workspaces/:id/members` | List members |
| `POST` | `/workspaces/:id/members/invite` | Invite by email |
| `DELETE` | `/workspaces/:id/members/:userId` | Remove member |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/projects?workspace_id=` | List projects in workspace |
| `POST` | `/projects` | Create project |
| `PATCH` | `/projects/:id` | Update project |
| `DELETE` | `/projects/:id` | Delete project (owner only) |

### Tasks
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tasks?project_id=` | List tasks (visibility-scoped) |
| `POST` | `/tasks` | Create task (`assignee_ids[]` or `assignee_emails[]`) |
| `GET` | `/tasks/:id` | Get task |
| `PATCH` | `/tasks/:id` | Update task (title, status, priority, description, due_date) |
| `DELETE` | `/tasks/:id` | Delete task |

### Subtasks
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tasks/:id/subtasks` | List subtasks |
| `POST` | `/tasks/:id/subtasks` | Create subtask |
| `PATCH` | `/tasks/:id/subtasks/:subtaskId` | Toggle is_done / rename |
| `DELETE` | `/tasks/:id/subtasks/:subtaskId` | Delete subtask |

### Comments (Chat)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tasks/:id/comments` | List messages |
| `POST` | `/tasks/:id/comments` | Add message |
| `DELETE` | `/tasks/:id/comments/:commentId` | Delete own message |

### Links & Attachments
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/tasks/:id/links` | List links |
| `POST` | `/tasks/:id/links` | Add link `{url, label?}` |
| `DELETE` | `/tasks/:id/links/:linkId` | Remove link |
| `GET` | `/tasks/:id/attachments` | List file attachments |
| `POST` | `/tasks/:id/attachments` | Upload file (multipart) |
| `DELETE` | `/tasks/:id/attachments/:attachmentId` | Delete attachment |

### Notifications
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/notifications` | List current user's notifications |
| `PATCH` | `/notifications/:id/read` | Mark one as read |
| `PATCH` | `/notifications/read-all` | Mark all as read |

---

## 🧪 Tests

Tests are located in `backend/tests/` and focus on the core business logic.

### Run tests

```bash
cd backend
npm test
```

### What is tested

**`tests/task.test.ts` — Task domain rules (Jest + Supertest)**

| Test case | What it validates |
|-----------|------------------|
| Create task with multiple assignees by email | Emails resolve to user IDs; `task_assignees` rows created |
| Non-assignee member cannot see task | Visibility scoping returns 403/empty list for non-assigned members |
| Owner always sees all tasks | `isOwnerOrAdminOfProject` returns true for workspace owner |
| Subtask completion triggers task status update | Toggle last subtask → parent task auto-moves to `done` |
| Duplicate subtask add | Idempotent — no duplicates created |
| Notification created on assignment | `notifications` row exists after task create with assignees |

**`tests/auth.test.ts` — Auth middleware**

| Test case | What it validates |
|-----------|------------------|
| Missing JWT returns 401 | `requireAuth` rejects requests without Bearer token |
| Invalid JWT returns 401 | Tampered token rejected by Supabase verification |
| Valid JWT passes through | Route handler receives `req.user` populated correctly |

> **Why these tests?** Task visibility and multi-assignee resolution are the two hardest pieces of business logic — they're what break if the data model changes. The auth middleware is the single point of failure for security, so it's covered explicitly.

---

## 📐 Assumptions & Trade-offs

### Assumptions

1. **Authentication is handled entirely by Supabase Auth.** The backend trusts Supabase JWTs and upserts the user on first login. No custom auth registration flow is built.

2. **Single workspace per user on onboarding.** A user is nudged to create exactly one workspace on first login. They can create more, but the UX is optimised for one primary workspace.

3. **Task visibility is role-based at the workspace level.** `owner` and `admin` workspace roles see all tasks. `member` role sees only tasks they are assigned to. This is enforced at the repository layer, not the database (no Supabase RLS).

4. **Assignees are added by email at task creation.** The backend resolves emails to user IDs by looking them up in the `users` table. If the email doesn't exist yet (user hasn't signed up), the assignee is silently skipped — no invitation flow is built.

5. **File uploads require AWS S3.** For local dev, file uploads will fail gracefully (no crash, just an error toast). This is acceptable because the core task management features work without it.

6. **No Redis required for local development.** Socket.IO is run in single-instance in-process mode. For a multi-instance production deployment, a Redis Socket.IO adapter would be needed.

### Trade-offs

| Decision | Why | What we gave up |
|----------|-----|-----------------|
| **No ORM (raw `pg` pool)** | Full control over SQL, easier to debug, no N+1 magic | More boilerplate for joins; schema changes require SQL migrations |
| **No Supabase RLS** | API-layer enforcement is easier to test and reason about | If someone bypasses the API with the anon key, Row Level Security is not a second line of defence |
| **Socket.IO in-process (no Redis adapter)** | Zero infrastructure overhead for dev/demo | Cannot scale to multiple backend instances horizontally without adding the Redis adapter |
| **Vanilla CSS (no Tailwind)** | Maximum control over design system, no class-name bloat | More verbose CSS; no utility shortcuts |
| **Framer Motion for all animations** | Consistent, physics-based animations with minimal code | Adds ~80 KB to bundle |
| **Optimistic chat messages** | Conversations feel instant | Message shows before server confirms — on error it's removed with a toast |
| **Email-based assignee lookup** | Simpler UX — just type emails, no member-search dropdown needed | Assignees must already have accounts; no pending-invite state |

---

## 🔮 Known Limitations & What I'd Do Next

### Current limitations

| Area | Limitation |
|------|-----------|
| **Invite flow** | Assigning a task to an email that hasn't signed up silently skips them — no email invite is sent |
| **Drag-and-drop Kanban** | Columns are visual-only; cards are not draggable between columns yet (status can be changed from the task panel) |
| **File uploads** | Requires AWS S3 config; disabled in local dev |
| **Email notifications** | AWS SES is wired up but not triggered yet for task assignments |
| **Horizontal scaling** | Socket.IO runs in-process; multiple Render instances would need a Redis adapter |
| **Search** | No global task or project search endpoint yet |
| **Mobile responsiveness** | The layout is optimised for desktop; mobile is functional but not polished |

### What I'd do next (priority order)

1. **Drag-and-drop Kanban** — Add `@dnd-kit/core` to enable card dragging between status columns
2. **Email invite on task assignment** — If the email doesn't exist in `users`, send a Supabase Auth invite link via SES
3. **Redis Socket.IO adapter** — `socket.io-redis` for multi-instance horizontal scaling on production
4. **Full-text search** — PostgreSQL `tsvector` + `GIN` index on task titles and descriptions
5. **Mobile-first redesign** — Responsive sidebar collapse, bottom sheet task panel
6. **Webhook support** — Fire webhooks on task state changes (Slack, GitHub Issues integration)
7. **Activity log** — Immutable audit trail per task (who changed what and when)
8. **Supabase RLS as a second layer** — Add policies to the DB as a defence-in-depth measure

---

## 🤖 AI Usage Disclosure

This project was built with significant AI assistance (Gemini/Antigravity). Here is an honest account of what was used, reviewed, and changed.

### What I used AI for

| Area | AI's role |
|------|-----------|
| **Initial boilerplate** | Generated the Fastify + Socket.IO project scaffold, env validation, and layer separation (controllers/services/repositories) |
| **Schema design iteration** | Brainstormed trade-offs for multi-assignee (junction table vs. JSONB array); agreed on junction table for query flexibility |
| **`taskRepository.ts` rewrite** | AI generated the multi-assignee SQL (`ARRAY_AGG` join, subtask progress counts) — reviewed and tested manually |
| **`TaskPanel.tsx`** | AI scaffolded the component structure; the subtask optimistic update logic and socket event wiring were iterated several times |
| **CSS design system** | AI proposed the colour palette and CSS variable naming conventions; all visual details were reviewed and adjusted |
| **Debugging 500 errors** | Used AI to interpret Supabase error logs (e.g., `null value in column workspace_id`) and trace the missing field back to the frontend request |
| **TypeScript error fixing** | AI batch-fixed `EventName` type mismatches and null-vs-undefined errors in the controller layer |

### What I reviewed and changed manually

- **All SQL queries** — verified `ARRAY_AGG` joins produce correct output shape before trusting them
- **Visibility scoping logic** — manually verified that member users cannot see tasks outside their assignments
- **Socket.IO event dispatch** — ensured events are emitted after the DB write, not before
- **Auth middleware** — read through the Supabase JWT verification flow and tested edge cases
- **CSS design system** — tweaked colour values, spacing, and border-radius tokens to match the target aesthetic
- **Environment variable handling** — verified no secrets leaked into frontend `.env.local.example`

### One example where I disagreed with the AI's output

**The AI initially suggested using Supabase RLS (Row Level Security) for task visibility** — writing policies directly on the `tasks` table so the database would automatically filter by user.

**I disagreed** because:
- RLS policies are hard to test without a real Supabase connection
- They create invisible query filters that make debugging confusing
- The service role client bypasses RLS anyway for admin operations
- API-layer enforcement in `taskRepository.findByProject` is explicit, co-located with the query, and easy to unit-test in isolation

So I kept RLS disabled and implemented visibility in the repository layer with a conditional `WHERE` clause based on `isOwnerOrAdmin`. Clear, testable, and portable to any PostgreSQL setup.

---

## 📁 Project Structure (Top-level)

```
Real-time-Collaborative-Task-Manager/
├── backend/                    # Fastify + TypeScript REST API + Socket.IO
│   ├── src/
│   │   ├── config/             # DB, Supabase, env
│   │   ├── controllers/        # Route handlers
│   │   ├── services/           # Business logic
│   │   ├── repositories/       # SQL layer (raw pg)
│   │   ├── models/
│   │   │   ├── schema.sql      # ← Run this in Supabase SQL Editor
│   │   │   └── migrate.ts
│   │   ├── routes/             # Fastify route registration
│   │   ├── middlewares/        # Auth guard, error handler
│   │   ├── websocket/          # Socket.IO events + room helpers
│   │   └── utils/              # apiResponse, logger, pagination
│   ├── tests/                  # Jest test suite
│   ├── .env.example            # ← Copy to .env
│   └── package.json
│
└── frontend/                   # Next.js 14 App Router
    ├── src/
    │   ├── app/                # File-based routes (Next.js)
    │   ├── components/         # UI components
    │   ├── lib/                # apiClient, socket, utils
    │   └── stores/             # Zustand (auth, UI)
    ├── .env.local.example      # ← Copy to .env.local
    └── package.json
```

---

## 🛠️ Scripts

**Backend (`cd backend`)**

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server with hot-reload (nodemon) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Start production server |
| `npm test` | Run Jest test suite |
| `npm run db:migrate` | Apply schema migrations |
| `npm run db:seed` | Seed demo data |

**Frontend (`cd frontend`)**

| Script | Description |
|--------|-------------|
| `npm run dev` | Next.js dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint check |

---

## 🔐 Security Notes

- JWT verification on every authenticated route via Supabase `getUser(token)`
- Helmet sets secure HTTP headers
- CORS restricted to `ALLOWED_ORIGINS` environment variable
- Rate limited at the Fastify layer
- Service-role key is server-side only; never exposed to the frontend
- File type and size validated before S3 upload

---

*Built with ❤️ using Next.js, Fastify, Supabase, and Socket.IO*
