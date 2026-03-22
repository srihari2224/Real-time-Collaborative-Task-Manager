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

export interface ApiAssignee {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface ApiTask {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'in_review' | 'done' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignees: ApiAssignee[];
  created_by: string;
  created_by_name?: string;
  due_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
  comment_count: number;
  attachment_count: number;
  subtask_total: number;
  subtask_done: number;
}

export interface ApiSubtask {
  id: string;
  task_id: string;
  title: string;
  is_done: boolean;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ApiComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: ApiUser;
  /** Flat author fields from SQL join (list endpoint) */
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface ApiAttachment {
  id: string;
  task_id: string;
  file_url: string;
  url?: string;
  file_name: string;
  filename?: string;
  file_size: number;
  size_bytes?: number;
  file_type: string | null;
  mime_type?: string | null;
  uploaded_by: string;
  uploaded_at: string;
  created_at?: string;
  uploader?: ApiUser;
}

export interface ApiLink {
  id: string;
  task_id: string;
  url: string;
  label: string | null;
  added_by: string;
  created_at: string;
}

export interface ApiNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  entity_id: string | null;
  entity_type: string | null;
  is_read: boolean;
  created_at: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function unwrap<T>(res: { data: { data: T } | T }): T {
  const d = res.data as any;
  return d?.data !== undefined ? d.data : d;
}

function unwrapPaginated<T>(res: { data: any }): T[] {
  const d = res.data as any;
  if (d?.data && typeof d.data === 'object' && !Array.isArray(d.data)) {
    const arrays = Object.values(d.data).filter((v) => Array.isArray(v));
    if (arrays.length > 0) return arrays[0] as T[];
  }
  if (Array.isArray(d?.data)) return d.data as T[];
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
    api.post(`${BASE}/projects`, {
      workspace_id: data.workspaceId,
      name: data.name,
      description: data.description,
      color: data.color
    }).then(unwrap<ApiProject>),
  update: (id: string, data: Partial<ApiProject>) =>
    api.put(`${BASE}/projects/${id}`, data).then(unwrap<ApiProject>),
  delete: (id: string) => api.delete(`${BASE}/projects/${id}`),
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const tasksApi = {
  listMyTasks: () =>
    api.get(`${BASE}/tasks/my-tasks`).then(unwrap<ApiTask[]>),
  listByProject: (projectId: string) =>
    api.get(`${BASE}/tasks/project/${projectId}`).then(unwrapPaginated<ApiTask>),
  get: (id: string) => api.get(`${BASE}/tasks/${id}`).then(unwrap<ApiTask>),
  create: (data: {
    projectId: string;
    title: string;
    description?: string;
    priority?: ApiTask['priority'];
    assigneeIds?: string[];
    assigneeEmails?: string[];
    dueDate?: string | null;
  }) => api.post(`${BASE}/tasks`, {
    project_id: data.projectId,
    title: data.title,
    description: data.description,
    priority: data.priority,
    assignee_ids: data.assigneeIds ?? [],
    assignee_emails: data.assigneeEmails ?? [],
    due_date: data.dueDate
  }).then(unwrap<ApiTask>),
  update: (
    id: string,
    data: Partial<Omit<ApiTask, 'id' | 'project_id' | 'created_by' | 'created_at' | 'updated_at' | 'assignees'>> & {
      assigneeIds?: string[];
    }
  ) => {
    const { assigneeIds, ...rest } = data;
    return api.put(`${BASE}/tasks/${id}`, {
      ...rest,
      ...(assigneeIds !== undefined ? { assignee_ids: assigneeIds } : {}),
    }).then(unwrap<ApiTask>);
  },
  delete: (id: string) => api.delete(`${BASE}/tasks/${id}`),

  // Subtasks
  listSubtasks: (id: string) =>
    api.get(`${BASE}/tasks/${id}/subtasks`).then(unwrap<ApiSubtask[]>),
  createSubtask: (id: string, title: string) =>
    api.post(`${BASE}/tasks/${id}/subtasks`, { title }).then(unwrap<ApiSubtask>),
  updateSubtask: (id: string, subtaskId: string, data: { title?: string; is_done?: boolean }) =>
    api.patch(`${BASE}/tasks/${id}/subtasks/${subtaskId}`, data).then(unwrap<ApiSubtask>),
  deleteSubtask: (id: string, subtaskId: string) =>
    api.delete(`${BASE}/tasks/${id}/subtasks/${subtaskId}`),

  // Comments
  listComments: (id: string) =>
    api.get(`${BASE}/tasks/${id}/comments`).then((res) => {
      const rows = unwrap<ApiComment[]>(res);
      return rows.map((c) => ({
        ...c,
        user:
          c.user ??
          ({
            id: c.user_id,
            email: c.email ?? '',
            full_name: c.full_name ?? null,
            avatar_url: c.avatar_url ?? null,
            created_at: c.created_at,
            updated_at: c.updated_at,
          } satisfies ApiUser),
      }));
    }),
  addComment: (id: string, content: string) =>
    api.post(`${BASE}/tasks/${id}/comments`, { content }).then(unwrap<ApiComment>),
  deleteComment: (id: string, commentId: string) =>
    api.delete(`${BASE}/tasks/${id}/comments/${commentId}`),

  // Links
  listLinks: (id: string) =>
    api.get(`${BASE}/tasks/${id}/links`).then(unwrap<ApiLink[]>),
  addLink: (id: string, url: string, label?: string) =>
    api.post(`${BASE}/tasks/${id}/links`, { url, label }).then(unwrap<ApiLink>),
  removeLink: (id: string, linkId: string) =>
    api.delete(`${BASE}/tasks/${id}/links/${linkId}`),

  // Attachments
  listAttachments: (id: string) =>
    api.get(`${BASE}/tasks/${id}/attachments`).then(unwrap<ApiAttachment[]>),
  uploadAttachment: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`${BASE}/tasks/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(unwrap<ApiAttachment>);
  },
  deleteAttachment: (id: string, attachmentId: string) =>
    api.delete(`${BASE}/tasks/${id}/attachments/${attachmentId}`),
};

// ─── Users ──────────────────────────────────────────────────────────────────

export const usersApi = {
  lookupByEmail: (email: string) =>
    api.get(`${BASE}/users/lookup?email=${encodeURIComponent(email)}`).then(unwrap<ApiUser>),
};

// ─── Notifications ───────────────────────────────────────────────────────────

export const notificationsApi = {
  list: () =>
    api.get(`${BASE}/notifications`).then((res) => {
      const d = (res.data as any)?.data ?? res.data;
      return {
        notifications: (d?.notifications ?? d ?? []) as ApiNotification[],
        unread_count: (d?.unread_count ?? 0) as number,
      };
    }),
  markRead: (id: string) => api.patch(`${BASE}/notifications/${id}/read`),
  markAllRead: () => api.patch(`${BASE}/notifications/read-all`),
  create: (data: {
    user_id: string;
    type: string;
    title: string;
    message?: string;
    entity_id?: string;
    entity_type?: string;
  }) => api.post(`${BASE}/notifications`, data).then(unwrap<ApiNotification>),
};

// ─── Profile ─────────────────────────────────────────────────────────────────

export const profileApi = {
  update: (data: { full_name?: string; avatar_url?: string }) =>
    api.patch(`${BASE}/auth/profile`, data).then(unwrap<ApiUser>),
};

