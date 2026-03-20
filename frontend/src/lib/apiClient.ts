// src/lib/apiClient.ts
// Typed API functions for all backend endpoints

import api from './api';

const BASE = '/api/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiWorkspace {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ApiWorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'guest';
  joined_at: string;
  user: ApiUser;
}

export interface ApiProject {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id: string | null;
  created_by: string;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  assignee?: ApiUser;
}

export interface ApiComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: ApiUser;
}

export interface ApiAttachment {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string | null;
  uploaded_by: string;
  uploaded_at: string;
  uploader?: ApiUser;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function unwrap<T>(res: { data: { data: T } | T }): T {
  const d = res.data as any;
  return d?.data !== undefined ? d.data : d;
}

// Paginated response: backend returns { data: { tasks, pagination } }
function unwrapPaginated<T>(res: { data: any }): T[] {
  const d = res.data as any;
  // Handle { data: { tasks: [...], pagination: {...} } }
  if (d?.data && typeof d.data === 'object' && !Array.isArray(d.data)) {
    // Find the first array value in d.data (tasks, items, etc.)
    const arrays = Object.values(d.data).filter((v) => Array.isArray(v));
    if (arrays.length > 0) return arrays[0] as T[];
  }
  // Handle { data: [...] }
  if (Array.isArray(d?.data)) return d.data as T[];
  // Handle plain array
  if (Array.isArray(d)) return d as T[];
  return [];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  sync: () => api.post(`${BASE}/auth/sync`, {}).then(unwrap<ApiUser>),
  me: () => api.get(`${BASE}/auth/me`).then(unwrap<ApiUser>),
};

// ─── Workspaces ──────────────────────────────────────────────────────────────

export const workspacesApi = {
  list: () => api.get(`${BASE}/workspaces`).then(unwrap<ApiWorkspace[]>),
  get: (id: string) => api.get(`${BASE}/workspaces/${id}`).then(unwrap<ApiWorkspace>),
  create: (data: { name: string; description?: string }) =>
    api.post(`${BASE}/workspaces`, data).then(unwrap<ApiWorkspace>),
  update: (id: string, data: Partial<ApiWorkspace>) =>
    api.put(`${BASE}/workspaces/${id}`, data).then(unwrap<ApiWorkspace>),
  delete: (id: string) => api.delete(`${BASE}/workspaces/${id}`),
  getMembers: (id: string) =>
    api.get(`${BASE}/workspaces/${id}/members`).then(unwrap<ApiWorkspaceMember[]>),
  inviteMember: (id: string, data: { email: string; role?: string }) =>
    api.post(`${BASE}/workspaces/${id}/members`, data).then(unwrap<ApiWorkspaceMember>),
  removeMember: (id: string, userId: string) =>
    api.delete(`${BASE}/workspaces/${id}/members/${userId}`),
};

// ─── Projects ────────────────────────────────────────────────────────────────

export const projectsApi = {
  listByWorkspace: (workspaceId: string) =>
    api.get(`${BASE}/projects/workspace/${workspaceId}`).then(unwrap<ApiProject[]>),
  get: (id: string) => api.get(`${BASE}/projects/${id}`).then(unwrap<ApiProject>),
  create: (data: { workspaceId: string; name: string; description?: string; color?: string }) =>
    api.post(`${BASE}/projects`, data).then(unwrap<ApiProject>),
  update: (id: string, data: Partial<ApiProject>) =>
    api.put(`${BASE}/projects/${id}`, data).then(unwrap<ApiProject>),
  delete: (id: string) => api.delete(`${BASE}/projects/${id}`),
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasksApi = {
  listByProject: (projectId: string) =>
    api.get(`${BASE}/tasks/project/${projectId}`).then(unwrapPaginated<ApiTask>),
  get: (id: string) => api.get(`${BASE}/tasks/${id}`).then(unwrap<ApiTask>),
  create: (data: {
    projectId: string;
    title: string;
    description?: string;
    status?: ApiTask['status'];
    priority?: ApiTask['priority'];
    assigneeId?: string | null;
    dueDate?: string | null;
  }) => api.post(`${BASE}/tasks`, data).then(unwrap<ApiTask>),
  update: (
    id: string,
    data: Partial<Omit<ApiTask, 'id' | 'project_id' | 'created_by' | 'created_at' | 'updated_at'>> & {
      assigneeId?: string | null;
    }
  ) => api.put(`${BASE}/tasks/${id}`, data).then(unwrap<ApiTask>),
  delete: (id: string) => api.delete(`${BASE}/tasks/${id}`),
  // Comments
  listComments: (id: string) =>
    api.get(`${BASE}/tasks/${id}/comments`).then(unwrap<ApiComment[]>),
  addComment: (id: string, content: string) =>
    api.post(`${BASE}/tasks/${id}/comments`, { content }).then(unwrap<ApiComment>),
  deleteComment: (id: string, commentId: string) =>
    api.delete(`${BASE}/tasks/${id}/comments/${commentId}`),
  // Attachments
  listAttachments: (id: string) =>
    api.get(`${BASE}/tasks/${id}/attachments`).then(unwrap<ApiAttachment[]>),
  deleteAttachment: (id: string, attachmentId: string) =>
    api.delete(`${BASE}/tasks/${id}/attachments/${attachmentId}`),
};
