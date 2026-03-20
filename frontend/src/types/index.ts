// ─── User & Auth ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

// ─── Workspace ─────────────────────────────────────────────────────────────

export type WorkspaceRole = 'owner' | 'admin' | 'member' | 'guest';

export interface Workspace {
  id: string;
  name: string;
  logo_url?: string;
  owner_id: string;
  timezone: string;
  created_at: string;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  user: User;
}

// ─── Project ───────────────────────────────────────────────────────────────

export type ViewType = 'kanban' | 'list' | 'calendar' | 'overview';
export type ProjectVisibility = 'public' | 'private';

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  visibility: ProjectVisibility;
  view_type: ViewType;
  created_at: string;
}

// ─── Section (Kanban Column) ────────────────────────────────────────────────

export interface Section {
  id: string;
  project_id: string;
  name: string;
  position: number;
  tasks?: Task[];
}

// ─── Task ──────────────────────────────────────────────────────────────────

export type Priority = 'urgent' | 'high' | 'medium' | 'low';

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  is_completed: boolean;
  position: number;
}

export interface Task {
  id: string;
  section_id: string;
  project_id: string;
  title: string;
  description?: string;
  priority: Priority;
  due_date?: string;
  created_by: string;
  created_at: string;
  assignees: User[];
  watchers: User[];
  subtasks: Subtask[];
  labels: Label[];
  attachments: Attachment[];
  unread_chat_count: number;
}

// ─── Attachments ───────────────────────────────────────────────────────────

export interface Attachment {
  id: string;
  task_id: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type?: string;
  uploaded_by: User;
  uploaded_at: string;
}

// ─── Chat ──────────────────────────────────────────────────────────────────

export interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  user: User;
}

export interface ChatMessage {
  id: string;
  task_id: string;
  sender_id: string;
  sender: User;
  content: string;
  parent_id?: string;
  replies?: ChatMessage[];
  reactions: ChatReaction[];
  is_edited: boolean;
  created_at: string;
  edited_at?: string;
  is_pinned?: boolean;
  attachments?: Attachment[];
}

export interface PinnedMessage {
  id: string;
  task_id: string;
  message_id: string;
  pinned_by: string;
  message: ChatMessage;
}

// ─── Activity ──────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  task_id: string;
  user_id: string;
  user: User;
  action_type: string;
  old_value?: string;
  new_value?: string;
  created_at: string;
}

// ─── Notifications ─────────────────────────────────────────────────────────

export type NotificationType =
  | 'task_assigned'
  | 'mention_description'
  | 'mention_chat'
  | 'chat_message'
  | 'task_overdue'
  | 'status_changed';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  entity_id: string;
  entity_type: string;
  is_read: boolean;
  created_at: string;
  task?: Task;
  sender?: User;
  message?: string;
}

// ─── UI State ──────────────────────────────────────────────────────────────

export interface UIState {
  sidebarOpen: boolean;
  searchOpen: boolean;
  taskPanelOpen: boolean;
  activePanelTaskId: string | null;
  activePanelTab: 'overview' | 'chat' | 'attachments' | 'activity';
  activeView: ViewType;
  theme: 'dark' | 'light';
}

// ─── WebSocket Events ───────────────────────────────────────────────────────

export interface SocketEvents {
  'task:moved': { taskId: string; fromSectionId: string; toSectionId: string; position: number };
  'task:updated': { taskId: string; changes: Partial<Task> };
  'task:created': { task: Task };
  'task:deleted': { taskId: string };
  'chat:message': { message: ChatMessage };
  'chat:typing': { userId: string; userName: string; taskId: string; isTyping: boolean };
  'chat:reaction': { messageId: string; reaction: ChatReaction; action: 'add' | 'remove' };
  'user:presence': { userId: string; projectId: string; online: boolean };
  'notification:new': { notification: Notification };
}

// ─── API Response ───────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
