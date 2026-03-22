> ⚠️ **Extension Notice:** I have submitted the Google Form within the deadline, but made a few additional commits after it. The project is complete as of the latest commit. I sincerely apologize for the delay and any inconvenience caused.

---

# TaskFlow — Real-time Collaborative Task Manager

> A full-stack, production-grade task management platform with real-time WebSocket collaboration, multi-assignee tasks, subtask checklists, in-app notifications, and live per-task team chat.

[![Live Demo](https://img.shields.io/badge/Live-Demo-22c55e?style=for-the-badge&logo=vercel)](https://taskify-ashen-chi.vercel.app/)

---

## 🗂️ Table of Contents

1. [Project Overview](#1-project-overview)
2. [Setup Instructions](#2-setup-instructions)
3. [Architecture Overview](#3-architecture-overview)
4. [Assumptions & Trade-offs](#4-assumptions--trade-offs)
5. [Known Limitations & What I'd Do Next](#5-known-limitations--what-id-do-next)
6. [AI Tools Section](#6-ai-tools-section)
7. [Tests](#7-tests)
8. [Database Schema & API Reference](#8-database-schema--api-reference)

---

## 1. Project Overview

TaskFlow is a collaborative task management platform where teams create workspaces and projects, assign tasks to multiple members, chat inside tasks in real-time, and track progress across Kanban, List, Calendar, and Overview views.

**Live Demo:** [https://taskify-ashen-chi.vercel.app](https://taskify-ashen-chi.vercel.app)

### Key flows you can test live

| Flow | Steps |
|------|-------|
| **Sign in** | Email/password or Google OAuth on the `/auth` page |
| **Create workspace** | Prompted on first login via `/onboarding` |
| **Create project** | Sidebar → "New Project" inside a workspace |
| **Create task (multi-assignee)** | "New Task" → add multiple emails → press Enter per email |
| **Subtask checklist** | Open task → Overview tab → type subtask → tick it to complete |
| **Real-time chat** | Open task → Chat tab → messages appear live in other tabs/browsers |
| **Notifications (Inbox)** | Assign a task to yourself → check Inbox for the notification |
| **My Tasks** | Left sidebar → "My Tasks" → filtered to tasks assigned to you |

---

### End-to-End Flow Walkthrough

> Step-by-step: **msrihari2224** creates a workspace → project → task with a full to-do checklist → assigns it to **mnarsimulu66791** → assignee instantly sees it under **My Tasks**.

**Flow context:**
-  **Workspace:** Engineering / Development
-  **Project:** Web Development
-  **Task Name:** Frontend
-  **Description:** Develop the user interface of the website. Convert UI/UX designs into a working website using frontend technologies. Connect frontend with backend APIs and ensure the website is responsive and user-friendly.
-  **To-Do Checklist:**
  - Setup project (React / HTML / CSS / JS)
  - Create folder structure
  - Create Navbar
  - Create Login Page UI
  - Create Signup Page UI
  - Create Dashboard UI
  - Connect frontend to backend API
  - Form validation
  - Error message handling
  - Make website responsive (mobile + desktop)
  - Testing in browser
  - Fix UI bugs
  - Final review
- 👤 **Created by:** msrihari2224 → **Assigned to:** mnarsimulu66791

<table>
  <tr>
    <td width="50%">
      <img src="./assets/Screenshot 2026-03-22 073954.png" alt="Step 1 — Sign in" style="border-radius:12px;width:100%;" />
    </td>
    <td width="50%">
      <img src="./assets/Screenshot 2026-03-22 074045.png" alt="Step 2 — Create Workspace" style="border-radius:12px;width:100%;" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="./assets/Screenshot 2026-03-22 074143.png" alt="Step 3 — Create Project" style="border-radius:12px;width:100%;" />
    </td>
    <td width="50%">
      <img src="./assets/Screenshot 2026-03-22 074348.png" alt="Step 4 — New Task" style="border-radius:12px;width:100%;" />
    </td>
  </tr>
 
  <tr>
    <td width="50%">
      <img src="./assets/Screenshot 2026-03-22 074524.png" alt="Step 7 — Add To-Do List" style="border-radius:12px;width:100%;" />
    </td>
    <td width="50%">
      <img src="./assets/Screenshot 2026-03-22 074534.png" alt="Step 8 — Assign Member" style="border-radius:12px;width:100%;" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="./assets/Screenshot 2026-03-22 074539.png" alt="Step 9 — Task Created on Board" style="border-radius:12px;width:100%;" />
    </td>
    <td width="50%">
      <img src="./assets/Screenshot 2026-03-22 074601.png" alt="Step 10 — Task Panel Overview" style="border-radius:12px;width:100%;" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="./assets/Screenshot 2026-03-22 074656.png" alt="Step 11 — Assignee logs in" style="border-radius:12px;width:100%;" />
    </td>
    <td width="50%">
      <img src="./assets/Screenshot 2026-03-22 074754.png" alt="Step 12 — Inbox Notification" style="border-radius:12px;width:100%;" />
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="./assets/Screenshot 2026-03-22 074814.png" alt="Step 13 — My Tasks (assignee view)" style="border-radius:12px;width:100%;" />
    </td>
    <td width="50%"></td>
  </tr>
</table>

> ✅ Once **msrihari2224** creates and assigns the `Frontend` task, **mnarsimulu66791** immediately sees it in their **My Tasks** section — delivered in real-time via Socket.IO.

---

## 2. Setup Instructions

> **No local database or Redis needed.** The backend uses Supabase (hosted PostgreSQL). Redis is not required for local dev.

### Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18.x |
| npm | ≥ 9.x |
| Supabase account | Free tier — [supabase.com](https://supabase.com) |

---

### Step 1 — Clone

```bash
git clone https://github.com/srihari2224/Real-time-Collaborative-Task-Manager.git
cd Real-time-Collaborative-Task-Manager
```

---

### Step 2 — Backend Setup

```bash
cd backend
npm install

# Mac/Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

**Environment variables required** (do NOT share the actual secret values):

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `DATABASE_URL` | Postgres connection string from Supabase |
| `JWT_SECRET` | Any random 32-character string |
| `ALLOWED_ORIGINS` | `http://localhost:3000` for local dev |
| `AWS_ACCESS_KEY_ID` | Optional — for file uploads only |
| `AWS_SECRET_ACCESS_KEY` | Optional — for file uploads only |
| `AWS_S3_BUCKET` | Optional — for file uploads only |
| `AWS_SES_REGION` | Optional — for email notifications only |

> AWS/S3/SES are optional — file uploads and email only work in production on Render where these are configured.

**Run the schema** in your Supabase → SQL Editor (full schema is in `backend/src/models/schema.sql`):

```bash
npm run dev
# API running at http://localhost:5000
```

**Optional — seed demo data:**

```bash
npm run db:seed
# Creates 1 workspace, 2 projects, 6 tasks, subtasks, links
```

---

### Step 3 — Frontend Setup

Open a **new terminal**:

```bash
cd frontend
npm install

# Mac/Linux
cp .env.local.example .env.local

# Windows PowerShell
Copy-Item .env.local.example .env.local
```

**Environment variables required:**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:5000` |
| `NEXT_PUBLIC_SOCKET_URL` | `http://localhost:5000` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID (for Google Sign-In button) |

```bash
npm run dev
# App running at http://localhost:3000
```

**That's it.** Open `http://localhost:3000` and sign in. ✅

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser (Next.js 14 — App Router)                                  │
│  - Zustand stores (auth, UI state)                                  │
│  - REST calls via apiClient.ts (typed)                              │
│  - Socket.IO client for real-time events                            │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  HTTPS / WSS
┌───────────────────────────────▼─────────────────────────────────────┐
│  Backend (Fastify + Node.js 18 + TypeScript)  — Render.com          │
│                                                                     │
│  HTTP Routes → Middleware → Controller → Service → Repository       │
│                                                                     │
│  Socket.IO Server (in-process — no Redis adapter for local dev)     │
│  - Workspace rooms  (task CRUD events)                              │
│  - Task rooms       (chat, subtask events)                          │
│                                                                     │
│  Uploads  → AWS S3 (presigned URLs)                                 │
│  Email    → AWS SES                                                 │
└───────────────────────────────┬─────────────────────────────────────┘
                                │  pg pool (raw SQL — no ORM)
┌───────────────────────────────▼─────────────────────────────────────┐
│  Supabase (PostgreSQL)                                              │
│  - Auth: email/password + Google OAuth via Google Identity Services │
│  - Row Level Security: disabled — enforced at the API layer         │
│  - Tables: users, workspaces, workspace_members, projects,          │
│    tasks, task_assignees, subtasks, task_links,                     │
│    comments, attachments, notifications                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

### Backend Stack

| Layer | Technology |
|-------|-----------|
| **Language** | TypeScript |
| **Runtime** | Node.js 18 |
| **Framework** | Fastify v4 |
| **Database** | PostgreSQL via Supabase |
| **Authentication** | Supabase Auth (email/password + Google OAuth) |
| **Real-time** | Socket.IO (in-process, workspace + task rooms) |
| **File Storage** | AWS S3 (presigned URL uploads) |
| **Email** | AWS SES |
| **Deployment** | Render.com |

**Backend directory structure:**
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

**Request lifecycle:**
```
Request → Helmet/CORS → Rate-limit → requireAuth (JWT) → Controller
       → Service → Repository → PostgreSQL
       → apiResponse JSON  +  emitToWorkspace/Task (Socket.IO)
```

---

### Frontend Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript |
| **Styling** | Vanilla CSS (custom design system — no Tailwind) |
| **State Management** | Zustand (global UI + auth) |
| **Animations** | Framer Motion |
| **Real-time** | Socket.IO client |
| **Charts** | Recharts (project overview) |
| **Auth Client** | Supabase Auth + Google Identity Services |
| **Deployment** | Vercel |

**Frontend directory structure:**
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
    ├── authStore.ts        # Zustand: current user + session
    └── uiStore.ts          # Zustand: task panel state, theme, sidebar
```

**Auth flow:**
```
1. User clicks "Sign in with Google"
2. Google Identity Services popup → returns a credential (JWT)
3. Frontend POSTs the credential to /api/v1/auth/google
4. Backend verifies with Supabase, upserts user row, returns session
5. Frontend stores token in Zustand (persisted to localStorage)
6. All subsequent API calls include Bearer <token> header
```

**Task assignment flow (email lookup):**
```
1. User types assignee email(s) at task creation
2. Frontend sends assignee_emails[] to POST /api/v1/tasks
3. Backend looks up each email in the users table
4. Matches → creates task_assignees rows + sends socket notification
5. No match (user not yet signed up) → silently skipped (no crash)
```

---

### Real-time Events (Socket.IO)

| Event | Trigger | Room |
|-------|---------|------|
| `task:created` | New task | Workspace room |
| `task:updated` | Edit / status change | Workspace room |
| `task:deleted` | Delete task | Workspace room |
| `comment:created` | New chat message | Task room |
| `comment:deleted` | Delete message | Task room |
| `subtask_created/updated/deleted` | Subtask CRUD | Task room |
| `link_added/removed` | Link CRUD | Task room |
| `notification` | Task assigned | Per-user channel |

---

## 4. Assumptions & Trade-offs

### Assumptions

1. **Authentication is handled entirely by Supabase Auth.** The backend trusts Supabase JWTs and upserts the user on first login — no custom registration flow is built.

2. **All users are workspace-based.** There is no concept of a personal account outside a workspace. This simplified permission checks across projects and tasks. The trade-off is that onboarding requires creating a workspace first, adding a small friction step for solo users.

3. **Task visibility is enforced at the repository layer, not in the database.** `owner` and `admin` workspace roles see all tasks. `member` role sees only assigned tasks. This avoids complex RLS policies that are hard to test.

4. **Real-time sync uses last-write-wins.** This is simpler to implement and sufficient for task management where simultaneous field edits are rare. The trade-off is occasional overwrite conflicts between users, handled with a toast notification rather than a merge UI.

5. **Assignees must already have accounts.** If an email doesn't exist in the `users` table, the assignment is silently skipped — no pending-invite state is tracked.

6. **File uploads require AWS S3.** For local development, uploads fail gracefully (error toast only — no crashes).

7. **No Redis required for local dev.** Socket.IO runs in-process (single instance). Multi-instance horizontal scaling would require the Redis adapter.

### Trade-offs

| Decision | Why | What we gave up |
|----------|-----|-----------------|
| **No ORM (raw `pg` pool)** | Full control over complex `ARRAY_AGG` multi-assignee SQL | More boilerplate; schema changes require raw SQL migrations |
| **No Supabase RLS** | API-layer enforcement is explicit, co-located with queries, and easy to unit-test | If someone bypasses the API with the anon key, no second line of defence |
| **Socket.IO in-process (no Redis adapter)** | Zero infrastructure overhead for dev/demo | Cannot scale horizontally without Redis |
| **Vanilla CSS (no Tailwind)** | Maximum design system control; no class-name bloat | More verbose; no utility shortcuts |
| **Framer Motion for animations** | Physics-based, consistent transitions | ~80 KB bundle addition |
| **Optimistic chat send** | Messages feel instant | Shows before server confirmation; removed on error |
| **Email-based assignee lookup** | Simpler UX (no member dropdowns) | Assignees must already have signed up |
| **Last-write-wins for concurrent edits** | Simple to implement; sufficient for this use case | Rare but possible silent overwrites when two users edit the same field simultaneously |

---

## 5. Known Limitations & What I'd Do Next

### Current Limitations

| Area | Limitation |
|------|-----------|
| **Invite flow** | Assigning to an unregistered email silently skips — no email invitation sent |
| **Drag-and-drop Kanban** | Cards are not draggable; status changes only via the task panel |
| **File uploads** | Requires AWS S3 config; disabled locally |
| **Email notifications** | AWS SES wired but not triggered for task assignments yet |
| **Horizontal scaling** | Socket.IO runs in-process; multi-instance needs Redis adapter |
| **Global search** | No full-text search across tasks or projects yet |

### What I'd Do Next (priority order)

1. **Drag-and-drop Kanban** — Add `@dnd-kit/core` for card dragging between columns
2. **Email invite on assignment** — If email not in `users`, send Supabase Auth invite link via SES
3. **Redis Socket.IO adapter** — `socket.io-redis` for multi-instance production scaling
4. **Full-text search** — PostgreSQL `tsvector` + `GIN` index on task titles/descriptions
5. **Supabase RLS as second layer** — Add DB policies as defence-in-depth
6. **Activity log** — Immutable audit trail per task (who changed what and when)
7. **Webhook support** — Fire webhooks on task state changes (Slack, GitHub Issues)

---

## 6. AI Tools Section

### Tools Used

| Tool | Role |
|------|------|
| **Antigravity (Google DeepMind)** | Primary coding assistant — architecture, full-stack implementation, bug fixing |
| **Claude Sonnet** | Code review, refactoring suggestions |
| **Cursor** | Planning and in-editor AI completions |
| **ChatGPT** | Brainstorming feature ideas and naming conventions |
| **Claude AI** | Architecture design and data model decisions |

### What I Used AI For

AI was used to scaffold repetitive boilerplate — route handlers, repository patterns, TypeScript type definitions, and the initial database schema. This saved significant time on structural work, leaving focus for the core product features like the task chat messenger and real-time WebSocket events.

| Area | AI's Role |
|------|----------|
| **Initial boilerplate** | Generated Fastify + Socket.IO scaffold, env validation, and layer separation |
| **Schema design** | Brainstormed trade-offs for multi-assignee (junction table vs. JSONB array) → agreed on junction for query flexibility |
| **`taskRepository.ts`** | Generated multi-assignee SQL (`ARRAY_AGG` join, subtask counts) — reviewed and tested manually |
| **`TaskPanel.tsx`** | Scaffolded component structure; subtask optimistic update and socket wiring were iterated several times |
| **CSS design system** | Proposed colour palette and CSS variable naming; all visual details reviewed and adjusted |
| **Debugging 500 errors** | Interpreted Supabase error logs and traced null field bugs back to the frontend |
| **TypeScript error fixing** | Batch-fixed `EventName` type mismatches and null-vs-undefined errors |

### What I Reviewed and Changed Manually

Every AI-generated file went through manual review. The Socket.IO room management logic was rewritten entirely because the AI generated a flat event system with no workspace scoping — events would broadcast to all connected users regardless of workspace. This was restructured into `workspace:{id}` and `task:{id}` rooms. Supabase query patterns were also manually adjusted to use the service role client where the AI had defaulted to the anon client, which caused silent permission failures under RLS.

Other manual review areas:

- **All SQL queries** — verified `ARRAY_AGG` joins before trusting their output shape
- **Visibility scoping logic** — manually verified member users cannot see unassigned tasks
- **Socket.IO event dispatch** — ensured events are emitted after the DB write, not before
- **Auth middleware** — read through Supabase JWT verification and tested edge cases
- **CSS design system** — tweaked colour values, spacing, and token names to match target aesthetic
- **Environment variable handling** — verified no secrets leaked into `.env.local.example`

### One Example Where I Disagreed With AI Output

For Google OAuth integration, the AI suggested using Passport.js with a custom callback strategy and storing sessions in Redis. This approach was rejected because the project was already using Supabase for auth — introducing Passport.js would create two separate auth systems with conflicting session management. The AI's setup was also failing silently during token exchange; the redirect URI was not being handled correctly.

The decision was to implement the Google OAuth flow directly through Supabase Auth's built-in provider support. This handled token verification and user creation natively without any additional library, kept the entire auth surface in one place, and eliminated the silent failure that Passport.js was producing.

---

## 7. Tests

Tests are located in `backend/tests/` and focus on core business logic.

### Run Tests

```bash
cd backend
npm test
```

### What Is Tested

**`tests/task.test.ts` — Task domain rules (Jest + Supertest)**

| Test Case | What It Validates |
|-----------|------------------|
| Create task with multiple assignees by email | Emails resolve to user IDs; `task_assignees` rows created |
| Non-assignee member cannot see task | Visibility scoping returns 403/empty for non-assigned members |
| Owner always sees all tasks | `isOwnerOrAdminOfProject` returns true for workspace owner |
| Subtask completion triggers parent update | Toggle last subtask → parent task auto-moves to `done` |
| Duplicate subtask add | Idempotent — no duplicates created |
| Notification created on assignment | `notifications` row exists after task create with assignees |

**`tests/auth.test.ts` — Auth middleware**

| Test Case | What It Validates |
|-----------|------------------|
| Missing JWT returns 401 | `requireAuth` rejects requests without Bearer token |
| Invalid JWT returns 401 | Tampered token rejected by Supabase verification |
| Valid JWT passes through | Route handler receives `req.user` populated correctly |

> **Why these tests?** Task visibility and multi-assignee resolution are the two hardest business logic pieces — they break if the data model changes. Auth middleware is the single security chokepoint, so it's covered explicitly.

---

## 8. Database Schema & API Reference

### Run Schema (Supabase SQL Editor)

Full schema is in [`backend/src/models/schema.sql`](./backend/src/models/schema.sql).

### Core Tables

```
users                 — synced from Supabase Auth on first sign-in
workspaces            — top-level container per team
workspace_members     — (workspace_id, user_id, role: owner|admin|member)
projects              — belong to a workspace
tasks                 — belong to a project
task_assignees        — junction: (task_id, user_id)   ← multi-assignee
subtasks              — ordered checklist items per task
task_links            — URLs attached to a task
comments              — real-time chat messages per task
attachments           — file metadata (stored in S3)
notifications         — in-app notification feed
```

### Key API Endpoints

Base URL (production): `https://real-time-collaborative-task-manager-yizi.onrender.com/api/v1`

All endpoints require `Authorization: Bearer <supabase-jwt>` except auth routes.

**Response envelope:**
```json
{ "success": true, "message": "...", "data": { ... }, "timestamp": "..." }
```

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/sync` | Upsert user from Supabase JWT on login |
| `GET` | `/workspaces` | List user's workspaces |
| `POST` | `/workspaces` | Create workspace |
| `GET` | `/workspaces/:id/members` | List members |
| `POST` | `/workspaces/:id/members/invite` | Invite by email |
| `GET` | `/projects?workspace_id=` | List projects in workspace |
| `POST` | `/projects` | Create project |
| `DELETE` | `/projects/:id` | Delete project (owner only) |
| `GET` | `/tasks?project_id=` | List tasks (visibility-scoped) |
| `POST` | `/tasks` | Create task with `assignee_emails[]` |
| `GET` | `/tasks/:id` | Get task detail |
| `PATCH` | `/tasks/:id` | Update task (title, status, priority, due_date) |
| `DELETE` | `/tasks/:id` | Delete task |
| `GET` | `/tasks/:id/subtasks` | List subtasks |
| `POST` | `/tasks/:id/subtasks` | Create subtask |
| `PATCH` | `/tasks/:id/subtasks/:subtaskId` | Toggle is_done / rename |
| `DELETE` | `/tasks/:id/subtasks/:subtaskId` | Delete subtask |
| `GET` | `/tasks/:id/comments` | List chat messages |
| `POST` | `/tasks/:id/comments` | Add chat message |
| `DELETE` | `/tasks/:id/comments/:commentId` | Delete own message |
| `GET` | `/notifications` | List user's notifications |
| `PATCH` | `/notifications/:id/read` | Mark one as read |
| `PATCH` | `/notifications/read-all` | Mark all as read |

---

## 🛠️ Scripts

**Backend (`cd backend`)**

| Script | Description |
|--------|------------|
| `npm run dev` | Dev server with hot-reload (ts-node + nodemon) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Start production server from `dist/` |
| `npm test` | Run Jest test suite |
| `npm run db:migrate` | Apply schema migrations |
| `npm run db:seed` | Seed demo data |

**Frontend (`cd frontend`)**

| Script | Description |
|--------|------------|
| `npm run dev` | Next.js dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm start` | Start production Next.js server |
| `npm run lint` | ESLint check |

---

## 🔐 Security Notes

- JWT verification on every authenticated route via Supabase `getUser(token)`
- Helmet sets secure HTTP headers
- CORS restricted to `ALLOWED_ORIGINS` environment variable
- Rate limited at the Fastify layer
- Service-role key is server-side only — never exposed to the frontend
- File type and size validated before S3 upload

---

*Built with ❤️ using Next.js 14, Fastify, TypeScript, Supabase, Socket.IO, and Framer Motion*