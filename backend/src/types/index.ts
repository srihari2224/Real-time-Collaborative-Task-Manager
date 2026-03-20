// src/types/index.ts
// Shared TypeScript interfaces and type augmentations

import type { FastifyRequest, FastifyReply } from 'fastify';

// ─── Domain Types ──────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Workspace {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
  owner_name?: string;
  owner_email?: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: Role;
  joined_at: Date;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export type Role = 'owner' | 'admin' | 'member' | 'guest';

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  created_by_name?: string;
  task_count?: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string | null;
  created_by: string;
  due_date: Date | null;
  position: number;
  created_at: Date;
  updated_at: Date;
  assignee_name?: string | null;
  assignee_email?: string | null;
  assignee_avatar?: string | null;
  created_by_name?: string;
  comment_count?: number;
  attachment_count?: number;
}

export interface Comment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: Date;
  updated_at: Date;
  full_name?: string | null;
  email?: string;
  avatar_url?: string | null;
}

export interface Attachment {
  id: string;
  task_id: string;
  uploaded_by: string;
  filename: string;
  s3_key: string;
  url: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: Date;
  uploaded_by_name?: string | null;
}

export interface PaginationResult {
  page: number;
  limit: number;
  total: number;
}

// ─── API Response shapes ───────────────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors: string | null;
  timestamp: string;
}

// ─── Fastify request augmentation ─────────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    user?: User & { id: string; email: string };
    workspaceMember?: WorkspaceMember;
  }
}

export type AuthRequest = FastifyRequest & Required<Pick<FastifyRequest, 'user'>>;

export type Handler = (req: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
