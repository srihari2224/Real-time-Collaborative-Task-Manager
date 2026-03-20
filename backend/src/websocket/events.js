// src/websocket/events.js
// WebSocket event name constants

export const EVENTS = Object.freeze({
  // Client → Server
  JOIN_WORKSPACE:  'join_workspace',
  LEAVE_WORKSPACE: 'leave_workspace',
  JOIN_TASK:       'join_task',
  LEAVE_TASK:      'leave_task',

  // Server → Client
  TASK_CREATED:    'task:created',
  TASK_UPDATED:    'task:updated',
  TASK_DELETED:    'task:deleted',
  COMMENT_CREATED: 'comment:created',
  COMMENT_DELETED: 'comment:deleted',
  MEMBER_JOINED:   'member:joined',
  MEMBER_LEFT:     'member:left',
  USER_PRESENCE:   'user:presence',
  ERROR:           'error',
});

export default EVENTS;
