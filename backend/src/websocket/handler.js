// src/websocket/handler.js
// Socket.IO server setup — auth middleware + room/event management

import { Server } from 'socket.io';
import { verifySupabaseToken } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { EVENTS } from './events.js';
import { env } from '../config/env.js';

let io;

/**
 * Initialise Socket.IO on the given HTTP server
 * @param {import('http').Server} httpServer
 */
export const initWebSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.cors.allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── Auth middleware ───────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) return next(new Error('Authentication token required'));

      const { user, error } = await verifySupabaseToken(token);
      if (error || !user) return next(new Error('Invalid or expired token'));

      socket.userId = user.id;
      socket.userEmail = user.email;
      next();
    } catch (err) {
      logger.error({ err }, 'WebSocket auth error');
      next(new Error('Authentication failed'));
    }
  });

  // ── Connection handler ────────────────────────────────────────
  io.on('connection', (socket) => {
    logger.info({ userId: socket.userId }, '🔌 WebSocket client connected');

    // Join workspace room
    socket.on(EVENTS.JOIN_WORKSPACE, (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
      logger.debug({ userId: socket.userId, workspaceId }, 'Joined workspace room');
    });

    // Leave workspace room
    socket.on(EVENTS.LEAVE_WORKSPACE, (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
    });

    // Join task room (for live comment updates)
    socket.on(EVENTS.JOIN_TASK, (taskId) => {
      socket.join(`task:${taskId}`);
    });

    // Leave task room
    socket.on(EVENTS.LEAVE_TASK, (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    socket.on('disconnect', () => {
      logger.debug({ userId: socket.userId }, '🔌 WebSocket client disconnected');
    });

    socket.on('error', (err) => {
      logger.error({ err, userId: socket.userId }, 'WebSocket error');
    });
  });

  logger.info('✅ Socket.IO WebSocket server initialised');
  return io;
};

/**
 * Get the Socket.IO instance (for emitting from services)
 */
export const getIO = () => {
  if (!io) throw new Error('WebSocket not initialised');
  return io;
};

/**
 * Emit a task event to a workspace room
 */
export const emitToWorkspace = (workspaceId, event, data) => {
  if (!io) return;
  io.to(`workspace:${workspaceId}`).emit(event, data);
};

/**
 * Emit a comment/update event to a task room
 */
export const emitToTask = (taskId, event, data) => {
  if (!io) return;
  io.to(`task:${taskId}`).emit(event, data);
};

export default { initWebSocket, getIO, emitToWorkspace, emitToTask };
