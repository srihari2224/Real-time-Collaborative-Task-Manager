// src/controllers/taskController.js

import * as taskService from '../services/taskService.js';
import * as commentService from '../services/commentService.js';
import * as fileService from '../services/fileService.js';
import * as apiResponse from '../utils/apiResponse.js';

// Tasks
export const createTask = async (req, reply) => {
  const task = await taskService.createTask(req.user.id, req.body);
  return apiResponse.created(reply, task, 'Task created');
};

export const listTasks = async (req, reply) => {
  const { tasks, pagination } = await taskService.listTasks(req.params.projectId, req.query);
  return apiResponse.paginated(reply, tasks, pagination);
};

export const getTask = async (req, reply) => {
  const task = await taskService.getTask(req.params.id);
  return apiResponse.success(reply, task);
};

export const updateTask = async (req, reply) => {
  const task = await taskService.updateTask(req.params.id, req.body);
  return apiResponse.success(reply, task, 'Task updated');
};

export const deleteTask = async (req, reply) => {
  await taskService.deleteTask(req.params.id);
  return apiResponse.success(reply, null, 'Task deleted');
};

// Comments
export const addComment = async (req, reply) => {
  const comment = await commentService.addComment(req.user.id, req.params.id, req.body);
  return apiResponse.created(reply, comment, 'Comment added');
};

export const listComments = async (req, reply) => {
  const comments = await commentService.listComments(req.params.id);
  return apiResponse.success(reply, comments);
};

export const deleteComment = async (req, reply) => {
  await commentService.deleteComment(req.params.commentId, req.user.id);
  return apiResponse.success(reply, null, 'Comment deleted');
};

// Attachments
export const uploadAttachment = async (req, reply) => {
  const file = await req.file();
  const attachment = await fileService.uploadAttachment(req.user.id, req.params.id, file);
  return apiResponse.created(reply, attachment, 'File uploaded');
};

export const listAttachments = async (req, reply) => {
  const attachments = await fileService.getAttachments(req.params.id);
  return apiResponse.success(reply, attachments);
};

export const deleteAttachment = async (req, reply) => {
  await fileService.removeAttachment(req.params.attachmentId, req.user.id);
  return apiResponse.success(reply, null, 'Attachment deleted');
};
