// src/controllers/taskController.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import * as taskService from '../services/taskService.js';
import * as apiResponse from '../utils/apiResponse.js';
import * as taskRepository from '../repositories/taskRepository.js';
import * as subtaskRepository from '../repositories/subtaskRepository.js';
import * as notificationRepository from '../repositories/notificationRepository.js';
import * as taskLinkRepository from '../repositories/taskLinkRepository.js';
import * as userRepository from '../repositories/userRepository.js';
import { sendTaskAssignedEmail } from '../services/emailService.js';
import { emitToWorkspace, emitToTask } from '../websocket/handler.js';
import { EVENTS } from '../websocket/events.js';
import * as commentService from '../services/commentService.js';
import * as fileService from '../services/fileService.js';

// ─── Tasks ───────────────────────────────────────────────────────────

export const createTask = async (req: FastifyRequest, reply: FastifyReply) => {
  const body = req.body as any;
  const { assignee_ids, assignee_emails, ...rest } = body;

  const task = await taskService.createTask(req.user!.id, rest);

  // Resolve assignees: accept both UUIDs and emails
  const ids: string[] = Array.isArray(assignee_ids) ? [...assignee_ids] : [];
  if (Array.isArray(assignee_emails)) {
    for (const email of assignee_emails) {
      const u = await userRepository.findByEmail(email).catch(() => null);
      if (u && !ids.includes(u.id)) ids.push(u.id);
    }
  }

  if (ids.length) {
    await taskRepository.setAssignees(task.id, ids);
    const assigner = req.user!;
    for (const uid of ids) {
      await notificationRepository.create({
        user_id: uid, type: 'task_assigned', entity_id: task.id, entity_type: 'task',
        title: 'You were assigned a task',
        message: `"${task.title}" was assigned to you by ${assigner.full_name ?? assigner.email}`,
      }).catch(() => null);

      // Send email notification immediately
      const assignee = await userRepository.findById(uid).catch(() => null);
      if (assignee?.email) {
        sendTaskAssignedEmail({
          to: assignee.email,
          assignerName: assigner.full_name ?? assigner.email,
          taskTitle: task.title,
          dueDate: task.due_date,
        }).catch(() => null);
      }
    }
  }

  const rich = await taskRepository.findById(task.id);
  apiResponse.created(reply, rich, 'Task created');

  const workspaceId = await taskRepository.findWorkspaceIdByProjectId(task.project_id).catch(() => null);
  if (workspaceId) {
    emitToWorkspace(workspaceId as string, EVENTS.TASK_CREATED, { task: rich });
    for (const uid of ids) {
      emitToWorkspace(workspaceId as string, EVENTS.NOTIFICATION, { user_id: uid });
    }
  }
};

export const listTasks = async (req: FastifyRequest, reply: FastifyReply) => {
  const { projectId } = req.params as { projectId: string };
  const q = req.query as any;

  const allowed = await taskService.isMemberOfProjectWorkspace(projectId, req.user!.id);
  if (!allowed) {
    return reply.code(403).send({ success: false, message: 'Not a member of this workspace' });
  }

  const { tasks, pagination } = await taskService.listTasks(projectId, { ...q });
  return apiResponse.paginated(reply, tasks, pagination);
};

export const listMyTasks = async (req: FastifyRequest, reply: FastifyReply) => {
  const tasks = await taskService.listMyTasks(req.user!.id);
  return apiResponse.success(reply, tasks);
};

export const getTask = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.success(reply, await taskService.getTask(id));
};

export const updateTask = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const body = req.body as any;
  const { assignee_ids, ...rest } = body;

  const task = await taskService.updateTask(id, rest);

  if (Array.isArray(assignee_ids)) {
    await taskRepository.setAssignees(id, assignee_ids);
    const assigner = req.user!;
    for (const uid of assignee_ids) {
      await notificationRepository.create({
        user_id: uid, type: 'task_assigned', entity_id: id, entity_type: 'task',
        title: 'You were assigned a task',
        message: `"${task.title}" was assigned to you by ${assigner.full_name ?? assigner.email}`,
      }).catch(() => null);

      // Send email notification immediately
      const assignee = await userRepository.findById(uid).catch(() => null);
      if (assignee?.email) {
        sendTaskAssignedEmail({
          to: assignee.email,
          assignerName: assigner.full_name ?? assigner.email,
          taskTitle: task.title,
          dueDate: task.due_date,
        }).catch(() => null);
      }
    }
  }

  const rich = await taskRepository.findById(id);
  apiResponse.success(reply, rich, 'Task updated');

  const workspaceId = await taskRepository.findWorkspaceIdByTaskId(id).catch(() => null);
  if (workspaceId) emitToWorkspace(workspaceId, EVENTS.TASK_UPDATED, { task: rich });
};

export const deleteTask = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const workspaceId = await taskRepository.findWorkspaceIdByTaskId(id).catch(() => null);
  await taskService.deleteTask(id);
  apiResponse.success(reply, null, 'Task deleted');
  if (workspaceId) emitToWorkspace(workspaceId, EVENTS.TASK_DELETED, { taskId: id });
};

// ─── Subtasks ─────────────────────────────────────────────────────────

export const listSubtasks = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.success(reply, await subtaskRepository.findByTask(id));
};

export const createSubtask = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const body = req.body as any;
  const subtask = await subtaskRepository.create({
    task_id: id, title: body.title, position: body.position, created_by: req.user!.id,
  });

  // Auto-update task status based on subtask completion
  await maybeUpdateTaskStatus(id);

  apiResponse.created(reply, subtask, 'Subtask created');
  emitToTask(id, EVENTS.SUBTASK_CREATED, { subtask });
};

export const updateSubtask = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id, subtaskId } = req.params as { id: string; subtaskId: string };
  const body = req.body as any;
  const subtask = await subtaskRepository.update(subtaskId, {
    title: body.title, is_done: body.is_done, position: body.position,
  });

  // Auto-update parent task status
  await maybeUpdateTaskStatus(id);

  apiResponse.success(reply, subtask, 'Subtask updated');
  emitToTask(id, EVENTS.SUBTASK_UPDATED, { subtask });

  // If all done, also emit task update upstream
  const { total, done } = await subtaskRepository.progress(id);
  if (total > 0 && done === total) {
    const updatedTask = await taskRepository.findById(id);
    const workspaceId = await taskRepository.findWorkspaceIdByTaskId(id).catch(() => null);
    if (workspaceId) emitToWorkspace(workspaceId as string, EVENTS.TASK_UPDATED, { task: updatedTask });
  }
};

export const deleteSubtask = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id, subtaskId } = req.params as { id: string; subtaskId: string };
  await subtaskRepository.remove(subtaskId);
  await maybeUpdateTaskStatus(id);
  apiResponse.success(reply, null, 'Subtask deleted');
  emitToTask(id, EVENTS.SUBTASK_DELETED, { subtaskId });
};

async function maybeUpdateTaskStatus(taskId: string): Promise<void> {
  const { total, done } = await subtaskRepository.progress(taskId);
  if (total === 0) {
    // No subtasks means 0% completion => todo.
    await taskRepository.update(taskId, { status: 'todo' as any });
    return;
  }
  let newStatus: string | undefined;
  if (done === total) newStatus = 'done';
  else if (done > 0) newStatus = 'in_progress';
  else newStatus = 'todo';
  await taskRepository.update(taskId, { status: newStatus as any });
}

// ─── Comments ────────────────────────────────────────────────────────

export const addComment = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const comment = await commentService.addComment(req.user!.id, id, req.body as any);
  apiResponse.created(reply, comment, 'Comment added');
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
  emitToTask(id, EVENTS.COMMENT_DELETED, { commentId });
};

// ─── Attachments ─────────────────────────────────────────────────────

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

// ─── Links ───────────────────────────────────────────────────────────

export const listLinks = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  return apiResponse.success(reply, await taskLinkRepository.findByTask(id));
};

export const addLink = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id } = req.params as { id: string };
  const body = req.body as any;
  const link = await taskLinkRepository.create({ task_id: id, url: body.url, label: body.label, added_by: req.user!.id });
  apiResponse.created(reply, link, 'Link added');
  emitToTask(id, EVENTS.LINK_ADDED, { link });
};

export const removeLink = async (req: FastifyRequest, reply: FastifyReply) => {
  const { id, linkId } = req.params as { id: string; linkId: string };
  await taskLinkRepository.remove(linkId, req.user!.id);
  apiResponse.success(reply, null, 'Link removed');
  emitToTask(id, EVENTS.LINK_REMOVED, { linkId });
};
