// src/websocket/handler.ts
import type { Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { verifySupabaseToken } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { EVENTS, type EventName } from './events.js';
import { env } from '../config/env.js';

interface AuthSocket extends Socket {
  userId: string;
  userEmail: string;
}

let io: Server | null = null;

export const initWebSocket = (httpServer: HttpServer): Server => {
  io = new Server(httpServer, {
    cors: { origin: env.cors.allowedOrigins, credentials: true },
    transports: ['websocket', 'polling'],
  });

  // ── Auth middleware ─────────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        (socket.handshake.auth as { token?: string })?.token ??
        socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication token required'));
      const { user, error } = await verifySupabaseToken(token);
      if (error || !user) return next(new Error('Invalid or expired token'));
      (socket as AuthSocket).userId = user.id;
      (socket as AuthSocket).userEmail = user.email ?? '';
      next();
    } catch (err) {
      logger.error({ err }, 'WebSocket auth error');
      next(new Error('Authentication failed'));
    }
  });

  // ── Connection ──────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const s = socket as AuthSocket;
    logger.info({ userId: s.userId }, '🔌 WebSocket client connected');

    socket.on(EVENTS.JOIN_WORKSPACE,  (id: string) => socket.join(`workspace:${id}`));
    socket.on(EVENTS.LEAVE_WORKSPACE, (id: string) => socket.leave(`workspace:${id}`));
    socket.on(EVENTS.JOIN_TASK,       (id: string) => socket.join(`task:${id}`));
    socket.on(EVENTS.LEAVE_TASK,      (id: string) => socket.leave(`task:${id}`));

    socket.on('disconnect', () => logger.debug({ userId: s.userId }, '🔌 WebSocket client disconnected'));
    socket.on('error', (err) => logger.error({ err, userId: s.userId }, 'WebSocket error'));
  });

  logger.info('✅ Socket.IO WebSocket server initialised');
  return io;
};

export const getIO = (): Server => {
  if (!io) throw new Error('WebSocket not initialised');
  return io;
};

export const emitToWorkspace = (workspaceId: string, event: EventName, data: unknown): void => {
  io?.to(`workspace:${workspaceId}`).emit(event, data);
};

export const emitToTask = (taskId: string, event: EventName, data: unknown): void => {
  io?.to(`task:${taskId}`).emit(event, data);
};

export default { initWebSocket, getIO, emitToWorkspace, emitToTask };
