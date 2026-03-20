// src/controllers/taskController.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as taskService from '../services/taskService.js';
import * as commentService from '../services/commentService.js';
import * as fileService from '../services/fileService.js';
import * as apiResponse from '../utils/apiResponse.js';
import * as taskRepository from '../repositories/taskRepository.js';
import { emitToWorkspace, emitToTask } from '../websocket/handler.js';
import { EVENTS } from '../websocket/events.js';

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const createTask = async (req: FastifyRequest, reply: FastifyReply) => {
  const body = req.body as any;
  const task = await taskService.createTask(req.user!.id, body);
  apiResponse.created(reply, task, 'Task created');

  // Emit real-time event to workspace room (non-blocking)
  const workspaceId = await taskRepository.findWorkspaceIdByProjectId(task.project_id).catch(() => null);
  if (workspaceId) emitToWorkspace(workspaceId, EVENTS.TASK_CREATED, { task });
};

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
  const task = await taskService.updateTask(id, req.body as any);
  apiResponse.success(reply, task, 'Task updated');

  // Emit real-time event to workspace room (non-blocking)
  const workspaceId = await taskRepository.findWorkspaceIdByTaskId(id).catch(() => null);
  if (workspaceId) emitToWorkspace(workspaceId, EVENTS.TASK_UPDATED, { task });
};

export const deleteTask = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };

  // Look up workspace BEFORE deleting (non-blocking, store result)
  const workspaceId = await taskRepository.findWorkspaceIdByTaskId(id).catch(() => null);

  await taskService.deleteTask(id);
  apiResponse.success(reply, null, 'Task deleted');

  if (workspaceId) emitToWorkspace(workspaceId, EVENTS.TASK_DELETED, { taskId: id });
};

// ─── Comments ────────────────────────────────────────────────────────────────

export const addComment = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const comment = await commentService.addComment(req.user!.id, id, req.body as any);
  apiResponse.created(reply, comment, 'Comment added');

  // Emit real-time event to task room (non-blocking)
  emitToTask(id, EVENTS.COMMENT_CREATED, { comment });
};

export const listComments = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.success(reply, await commentService.listComments(id));
};

export const deleteComment = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id, commentId } = req.params as { id: string; commentId: string };
  await commentService.deleteComment(commentId, req.user!.id);
  apiResponse.success(reply, null, 'Comment deleted');

  // Emit real-time event to task room (non-blocking)
  emitToTask(id, EVENTS.COMMENT_DELETED, { commentId });
};

// ─── Attachments ─────────────────────────────────────────────────────────────

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
