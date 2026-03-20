// src/services/commentService.js

import * as commentRepository from '../repositories/commentRepository.js';

export const addComment = async (userId, taskId, { content }) => {
  return commentRepository.create({ task_id: taskId, user_id: userId, content });
};

export const listComments = async (taskId) => {
  return commentRepository.findByTask(taskId);
};

export const deleteComment = async (commentId, userId) => {
  const comment = await commentRepository.findById(commentId);
  if (!comment) throw Object.assign(new Error('Comment not found'), { statusCode: 404 });
  if (comment.user_id !== userId) throw Object.assign(new Error('You can only delete your own comments'), { statusCode: 403 });
  await commentRepository.remove(commentId);
};
