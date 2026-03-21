-- ============================================================
--  TaskFlow — PostgreSQL Schema (FULL — includes all migrations)
--  Run in Supabase SQL Editor to apply full schema
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  full_name     TEXT,
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Workspaces ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  description   TEXT,
  logo_url      TEXT,
  owner_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Workspace Members ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner','admin','member','guest')),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ─── Projects ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  color         TEXT DEFAULT '#6366f1',
  created_by    UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'todo'
                  CHECK (status IN ('todo','in_progress','in_review','done','cancelled')),
  priority      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low','medium','high','urgent')),
  created_by    UUID NOT NULL REFERENCES users(id),
  due_date      DATE,
  position      INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Remove old single assignee column if it exists (migration)
ALTER TABLE tasks DROP COLUMN IF EXISTS assignee_id;

-- ─── Task Assignees (multiple assignees per task) ─────────────
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (task_id, user_id)
);

-- ─── Subtasks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subtasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  is_done     BOOLEAN NOT NULL DEFAULT false,
  position    INTEGER DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Task Comments ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Task Links ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_links (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  label       TEXT,
  added_by    UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Attachments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attachments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES users(id),
  filename      TEXT NOT NULL,
  s3_key        TEXT DEFAULT '',
  url           TEXT NOT NULL,
  mime_type     TEXT,
  size_bytes    BIGINT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  entity_id   UUID,
  entity_type TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_workspace_members_user    ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace        ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project             ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status              ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task       ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user       ON task_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task             ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task        ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_links_task           ON task_links(task_id);
CREATE INDEX IF NOT EXISTS idx_attachments_task          ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user        ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread      ON notifications(user_id, is_read);

-- ─── Auto-update updated_at trigger ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_workspaces_updated_at
    BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_tasks_updated_at
    BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_task_comments_updated_at
    BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_subtasks_updated_at
    BEFORE UPDATE ON subtasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
