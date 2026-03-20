-- ================================================================
-- TaskFlow Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID        PRIMARY KEY,  -- matches Supabase auth.users.id
  email       TEXT        NOT NULL UNIQUE,
  full_name   TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Workspaces ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  description TEXT,
  logo_url    TEXT,
  owner_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Workspace Members ────────────────────────────────────────────
CREATE TYPE IF NOT EXISTS workspace_role AS ENUM ('owner', 'admin', 'member', 'guest');

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id UUID         NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID         NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  role         workspace_role NOT NULL DEFAULT 'member',
  joined_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ─── Projects ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID        NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  description  TEXT,
  color        TEXT        NOT NULL DEFAULT '#6366f1',
  created_by   UUID        NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tasks ────────────────────────────────────────────────────────
CREATE TYPE IF NOT EXISTS task_status   AS ENUM ('todo', 'in_progress', 'in_review', 'done', 'cancelled');
CREATE TYPE IF NOT EXISTS task_priority AS ENUM ('low', 'medium', 'high', 'urgent');

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id   UUID           NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title        TEXT           NOT NULL,
  description  TEXT,
  status       task_status    NOT NULL DEFAULT 'todo',
  priority     task_priority  NOT NULL DEFAULT 'medium',
  assignee_id  UUID           REFERENCES users(id) ON DELETE SET NULL,
  created_by   UUID           NOT NULL REFERENCES users(id),
  due_date     TIMESTAMPTZ,
  position     INTEGER        NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ─── Task Comments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Attachments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name   TEXT        NOT NULL,
  file_url    TEXT        NOT NULL,
  file_size   BIGINT      NOT NULL DEFAULT 0,
  file_type   TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes for performance ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workspace_members_user     ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace         ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project              ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee             ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task         ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_task           ON attachments(task_id);

-- ─── Auto-update updated_at ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER users_updated_at      BEFORE UPDATE ON users      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER projects_updated_at   BEFORE UPDATE ON projects   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER tasks_updated_at      BEFORE UPDATE ON tasks      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER comments_updated_at   BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
