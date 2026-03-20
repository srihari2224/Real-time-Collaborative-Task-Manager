// src/controllers/taskController.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as taskService from '../services/taskService.js';
import * as commentService from '../services/commentService.js';
import * as fileService from '../services/fileService.js';
import * as apiResponse from '../utils/apiResponse.js';

// Tasks
export const createTask = async (req: FastifyRequest, reply: FastifyReply) =>
  apiResponse.created(reply, await taskService.createTask(req.user!.id, req.body as any), 'Task created');

export const listTasks = async (req: FastifyRequest, reply: FastifyReply) => {
  const { projectId } = req.params as { projectId: string };
  const { tasks, pagination } = await taskService.listTasks(projectId, req.query as any);
  return apiResponse.paginated(reply, tasks, pagination);
};

export const getTask = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.success(reply, await taskService.getTask(id));
};

export const updateTask = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.success(reply, await taskService.updateTask(id, req.body as any), 'Task updated');
};

export const deleteTask = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  await taskService.deleteTask(id);
  return apiResponse.success(reply, null, 'Task deleted');
};

// Comments
export const addComment = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.created(reply, await commentService.addComment(req.user!.id, id, req.body as any), 'Comment added');
};

export const listComments = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.success(reply, await commentService.listComments(id));
};

export const deleteComment = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id, commentId } = req.params as { id: string; commentId: string };
  await commentService.deleteComment(commentId, req.user!.id);
  return apiResponse.success(reply, null, 'Comment deleted');
};

// Attachments
export const uploadAttachment = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const file = await req.file();
  return apiResponse.created(reply, await fileService.uploadAttachment(req.user!.id, id, file!), 'File uploaded');
};

export const listAttachments = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.success(reply, await fileService.getAttachments(id));
};

export const deleteAttachment = async (req: FastifyRequest, reply: FastifyReply) => {
  const { attachmentId } = req.params as { attachmentId: string };
  await fileService.removeAttachment(attachmentId, req.user!.id);
  return apiResponse.success(reply, null, 'Attachment deleted');
};
