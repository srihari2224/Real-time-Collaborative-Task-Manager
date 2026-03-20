import { User, Workspace, Project, Section, Task, ChatMessage, Notification, ActivityLog } from '@/types';

// ─── Users ──────────────────────────────────────────────────────────────────

export const USERS: User[] = [
  { id: 'u1', name: 'Sarah Chen', email: 'sarah@acme.com', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah', created_at: '2026-01-10T00:00:00Z' },
  { id: 'u2', name: 'Tom Richards', email: 'tom@acme.com', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tom', created_at: '2026-01-11T00:00:00Z' },
  { id: 'u3', name: 'Priya Sharma', email: 'priya@acme.com', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya', created_at: '2026-01-12T00:00:00Z' },
  { id: 'u4', name: 'Jake Morrison', email: 'jake@acme.com', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jake', created_at: '2026-01-13T00:00:00Z' },
  { id: 'u5', name: 'Lex Taylor', email: 'lex@acme.com', avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lex', created_at: '2026-01-14T00:00:00Z' },
];

export const CURRENT_USER = USERS[0]; // Sarah (Owner)

// ─── Workspace ──────────────────────────────────────────────────────────────

export const WORKSPACE: Workspace = {
  id: 'ws-acme',
  name: 'Acme Design Team',
  logo_url: undefined,
  owner_id: 'u1',
  timezone: 'America/New_York',
  created_at: '2026-01-10T00:00:00Z',
};

// ─── Projects ───────────────────────────────────────────────────────────────

export const PROJECTS: Project[] = [
  { id: 'p1', workspace_id: 'ws-acme', name: 'Website Redesign', description: 'Complete overhaul of the marketing website', color: '#ff6b47', icon: 'globe', visibility: 'public', view_type: 'kanban', created_at: '2026-01-15T00:00:00Z' },
  { id: 'p2', workspace_id: 'ws-acme', name: 'Mobile App V2', description: 'Next generation mobile experience', color: '#6366f1', icon: 'smartphone', visibility: 'public', view_type: 'list', created_at: '2026-01-20T00:00:00Z' },
  { id: 'p3', workspace_id: 'ws-acme', name: 'Brand Guidelines', description: 'Design system and brand standards', color: '#22c55e', icon: 'palette', visibility: 'private', view_type: 'calendar', created_at: '2026-02-01T00:00:00Z' },
];

// ─── Sections ───────────────────────────────────────────────────────────────

export const SECTIONS: Section[] = [
  { id: 's1', project_id: 'p1', name: 'Backlog', position: 0 },
  { id: 's2', project_id: 'p1', name: 'In Progress', position: 1 },
  { id: 's3', project_id: 'p1', name: 'In Review', position: 2 },
  { id: 's4', project_id: 'p1', name: 'Done', position: 3 },
];

// ─── Tasks ──────────────────────────────────────────────────────────────────

export const TASKS: Task[] = [
  {
    id: 't1',
    section_id: 's1',
    project_id: 'p1',
    title: 'Redesign homepage hero section',
    description: '**Goal:** Create a bold, conversion-focused hero section.\n\n- Update copy and CTA\n- New visual direction\n- Mobile-first layout',
    priority: 'urgent',
    due_date: '2026-03-18T00:00:00Z', // overdue
    created_by: 'u1',
    created_at: '2026-03-01T00:00:00Z',
    assignees: [USERS[2], USERS[3]],
    watchers: [USERS[0]],
    labels: [{ id: 'l1', name: 'Design', color: '#6366f1' }, { id: 'l2', name: 'Frontend', color: '#22c55e' }],
    subtasks: [
      { id: 'st1', task_id: 't1', title: 'Wireframe hero layout', is_completed: true, position: 0 },
      { id: 'st2', task_id: 't1', title: 'Design in Figma', is_completed: true, position: 1 },
      { id: 'st3', task_id: 't1', title: 'Get design approval', is_completed: false, position: 2 },
      { id: 'st4', task_id: 't1', title: 'Implement in code', is_completed: false, position: 3 },
      { id: 'st5', task_id: 't1', title: 'Cross-browser testing', is_completed: false, position: 4 },
    ],
    attachments: [],
    unread_chat_count: 3,
  },
  {
    id: 't2',
    section_id: 's2',
    project_id: 'p1',
    title: 'Build navigation component',
    description: 'Responsive nav with dropdown menus and mobile hamburger',
    priority: 'high',
    due_date: '2026-03-20T00:00:00Z', // due today
    created_by: 'u2',
    created_at: '2026-03-05T00:00:00Z',
    assignees: [USERS[1]],
    watchers: [USERS[0], USERS[2]],
    labels: [{ id: 'l2', name: 'Frontend', color: '#22c55e' }],
    subtasks: [
      { id: 'st6', task_id: 't2', title: 'Desktop nav', is_completed: true, position: 0 },
      { id: 'st7', task_id: 't2', title: 'Mobile nav', is_completed: false, position: 1 },
      { id: 'st8', task_id: 't2', title: 'Dropdowns', is_completed: false, position: 2 },
    ],
    attachments: [],
    unread_chat_count: 1,
  },
  {
    id: 't3',
    section_id: 's2',
    project_id: 'p1',
    title: 'Set up design token system',
    description: 'Configure CSS custom properties for colors, spacing, and typography',
    priority: 'medium',
    due_date: '2026-03-25T00:00:00Z',
    created_by: 'u1',
    created_at: '2026-03-08T00:00:00Z',
    assignees: [USERS[2]],
    watchers: [USERS[0]],
    labels: [{ id: 'l3', name: 'System', color: '#f59e0b' }],
    subtasks: [
      { id: 'st9', task_id: 't3', title: 'Color tokens', is_completed: true, position: 0 },
      { id: 'st10', task_id: 't3', title: 'Typography tokens', is_completed: true, position: 1 },
      { id: 'st11', task_id: 't3', title: 'Spacing tokens', is_completed: false, position: 2 },
    ],
    attachments: [],
    unread_chat_count: 0,
  },
  {
    id: 't4',
    section_id: 's3',
    project_id: 'p1',
    title: 'Create contact form with validation',
    description: 'Accessible form with client and server-side validation',
    priority: 'medium',
    due_date: '2026-03-22T00:00:00Z',
    created_by: 'u2',
    created_at: '2026-03-10T00:00:00Z',
    assignees: [USERS[3]],
    watchers: [USERS[1]],
    labels: [{ id: 'l2', name: 'Frontend', color: '#22c55e' }],
    subtasks: [
      { id: 'st12', task_id: 't4', title: 'Form HTML', is_completed: true, position: 0 },
      { id: 'st13', task_id: 't4', title: 'Validation logic', is_completed: true, position: 1 },
      { id: 'st14', task_id: 't4', title: 'Success/error states', is_completed: true, position: 2 },
    ],
    attachments: [],
    unread_chat_count: 2,
  },
  {
    id: 't5',
    section_id: 's4',
    project_id: 'p1',
    title: 'SEO meta tags and sitemap',
    description: 'Add proper Open Graph, Twitter Card, and schema.org markup',
    priority: 'low',
    due_date: '2026-03-15T00:00:00Z',
    created_by: 'u1',
    created_at: '2026-03-02T00:00:00Z',
    assignees: [USERS[0]],
    watchers: [],
    labels: [{ id: 'l4', name: 'SEO', color: '#ec4899' }],
    subtasks: [
      { id: 'st15', task_id: 't5', title: 'Meta tags', is_completed: true, position: 0 },
      { id: 'st16', task_id: 't5', title: 'Sitemap.xml', is_completed: true, position: 1 },
      { id: 'st17', task_id: 't5', title: 'Schema markup', is_completed: true, position: 2 },
    ],
    attachments: [],
    unread_chat_count: 0,
  },
];

// ─── Chat Messages ───────────────────────────────────────────────────────────

export const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'cm1',
    task_id: 't1',
    sender_id: 'u3',
    sender: USERS[2],
    content: 'Hey @Tom, I finished the wireframes. Can you review before I move to Figma? Dropping the Figma link here once done.',
    reactions: [
      { id: 'r1', message_id: 'cm1', user_id: 'u1', emoji: '👍', user: USERS[0] },
      { id: 'r2', message_id: 'cm1', user_id: 'u4', emoji: '👍', user: USERS[3] },
    ],
    is_edited: false,
    created_at: '2026-03-15T09:30:00Z',
    replies: [],
  },
  {
    id: 'cm2',
    task_id: 't1',
    sender_id: 'u2',
    sender: USERS[1],
    content: 'Sure! Looking now. The hero layout looks clean — one thing: can we try a more asymmetric layout? The centered version feels too generic.',
    reactions: [
      { id: 'r3', message_id: 'cm2', user_id: 'u3', emoji: '💯', user: USERS[2] },
    ],
    is_edited: false,
    created_at: '2026-03-15T10:15:00Z',
    replies: [
      {
        id: 'cm2r1',
        task_id: 't1',
        sender_id: 'u3',
        sender: USERS[2],
        content: 'Great idea! I\'ll explore a split-screen layout with the visual on the right.',
        parent_id: 'cm2',
        reactions: [],
        is_edited: false,
        created_at: '2026-03-15T10:22:00Z',
      },
    ],
  },
  {
    id: 'cm3',
    task_id: 't1',
    sender_id: 'u4',
    sender: USERS[3],
    content: 'I pushed the initial code structure. @Priya when you have the Figma ready, just share and I\'ll start the implementation in parallel.',
    reactions: [
      { id: 'r4', message_id: 'cm3', user_id: 'u1', emoji: '🚀', user: USERS[0] },
    ],
    is_edited: false,
    created_at: '2026-03-16T14:00:00Z',
    is_pinned: true,
  },
  {
    id: 'cm4',
    task_id: 't1',
    sender_id: 'u1',
    sender: USERS[0],
    content: 'This is looking really good. Client wants it done by EOD Friday — can we make that work?',
    reactions: [],
    is_edited: false,
    created_at: '2026-03-18T09:00:00Z',
  },
  {
    id: 'cm5',
    task_id: 't1',
    sender_id: 'u3',
    sender: USERS[2],
    content: 'Figma designs are ready! Here\'s the link: [View in Figma](https://figma.com/design/acme-hero). I incorporated the asymmetric layout — it looks great with the gradient background.',
    reactions: [
      { id: 'r5', message_id: 'cm5', user_id: 'u2', emoji: '🔥', user: USERS[1] },
      { id: 'r6', message_id: 'cm5', user_id: 'u1', emoji: '🔥', user: USERS[0] },
      { id: 'r7', message_id: 'cm5', user_id: 'u4', emoji: '❤️', user: USERS[3] },
    ],
    is_edited: false,
    created_at: '2026-03-19T11:30:00Z',
  },
];

// ─── Notifications ───────────────────────────────────────────────────────────

export const NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    user_id: 'u1',
    type: 'mention_chat',
    entity_id: 't1',
    entity_type: 'task',
    is_read: false,
    created_at: '2026-03-19T11:30:00Z',
    task: TASKS[0],
    sender: USERS[2],
    message: 'mentioned you in Task Chat',
  },
  {
    id: 'n2',
    user_id: 'u1',
    type: 'task_assigned',
    entity_id: 't2',
    entity_type: 'task',
    is_read: false,
    created_at: '2026-03-19T10:00:00Z',
    task: TASKS[1],
    sender: USERS[1],
    message: 'assigned you to a task',
  },
  {
    id: 'n3',
    user_id: 'u1',
    type: 'task_overdue',
    entity_id: 't1',
    entity_type: 'task',
    is_read: true,
    created_at: '2026-03-18T09:00:00Z',
    task: TASKS[0],
    message: 'Task is overdue',
  },
];

// ─── Activity Logs ───────────────────────────────────────────────────────────

export const ACTIVITY_LOGS: ActivityLog[] = [
  { id: 'a1', task_id: 't1', user_id: 'u1', user: USERS[0], action_type: 'created', created_at: '2026-03-01T00:00:00Z' },
  { id: 'a2', task_id: 't1', user_id: 'u1', user: USERS[0], action_type: 'assigned', new_value: 'Priya Sharma', created_at: '2026-03-01T00:01:00Z' },
  { id: 'a3', task_id: 't1', user_id: 'u1', user: USERS[0], action_type: 'assigned', new_value: 'Jake Morrison', created_at: '2026-03-01T00:01:00Z' },
  { id: 'a4', task_id: 't1', user_id: 'u2', user: USERS[1], action_type: 'status_changed', old_value: 'Backlog', new_value: 'In Progress', created_at: '2026-03-10T14:00:00Z' },
  { id: 'a5', task_id: 't1', user_id: 'u4', user: USERS[3], action_type: 'moved', new_value: 'In Review', created_at: '2026-03-18T16:30:00Z' },
  { id: 'a6', task_id: 't1', user_id: 'u2', user: USERS[1], action_type: 'due_date_updated', old_value: '2026-03-15', new_value: '2026-03-18', created_at: '2026-03-12T09:00:00Z' },
];
