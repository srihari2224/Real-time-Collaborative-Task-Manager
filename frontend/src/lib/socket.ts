// src/lib/socket.ts
// Socket.IO client singleton with Supabase JWT auth

import { io, Socket } from 'socket.io-client';
import { supabase } from './supabase';

let socket: Socket | null = null;

export async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => console.log('🔌 Socket.IO connected', socket?.id));
  socket.on('disconnect', (reason) => console.log('🔌 Socket.IO disconnected', reason));
  socket.on('connect_error', (err) => console.warn('Socket.IO error:', err.message));

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// Event names matching the backend (src/websocket/events.ts)
export const SOCKET_EVENTS = {
  // Rooms
  JOIN_WORKSPACE:  'join_workspace',
  LEAVE_WORKSPACE: 'leave_workspace',
  JOIN_TASK:       'join_task',
  LEAVE_TASK:      'leave_task',
  // Task events
  TASK_CREATED:    'task:created',
  TASK_UPDATED:    'task:updated',
  TASK_DELETED:    'task:deleted',
  // Comment events
  COMMENT_CREATED: 'comment:created',
  COMMENT_DELETED: 'comment:deleted',
  // Member events
  MEMBER_JOINED:   'member:joined',
  MEMBER_LEFT:     'member:left',
  // Presence
  USER_PRESENCE:   'user:presence',
  ERROR:           'error',
} as const;
