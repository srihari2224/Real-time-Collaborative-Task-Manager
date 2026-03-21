// src/controllers/notificationController.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as notificationRepository from '../repositories/notificationRepository.js';
import * as apiResponse from '../utils/apiResponse.js';

export const listNotifications = async (req: FastifyRequest, reply: FastifyReply) => {
  const notes = await notificationRepository.findByUser(req.user!.id);
  const unread = await notificationRepository.unreadCount(req.user!.id);
  return apiResponse.success(reply, { notifications: notes, unread_count: unread });
};

export const markRead = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  await notificationRepository.markRead(id, req.user!.id);
  return apiResponse.success(reply, null, 'Marked as read');
};

export const markAllRead = async (req: FastifyRequest, reply: FastifyReply) => {
  await notificationRepository.markAllRead(req.user!.id);
  return apiResponse.success(reply, null, 'All marked as read');
};
