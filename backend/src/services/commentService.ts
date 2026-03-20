// src/services/commentService.ts
import type { Comment } from '../types/index.js';
import * as commentRepository from '../repositories/commentRepository.js';

export const addComment = (userId: string, taskId: string, data: { content: string }): Promise<Comment> =>
  commentRepository.create({ task_id: taskId, user_id: userId, content: data.content });

export const listComments = (taskId: string): Promise<Comment[]> =>
  commentRepository.findByTask(taskId);

export const deleteComment = async (commentId: string, userId: string): Promise<void> => {
  const comment = await commentRepository.findById(commentId);
  if (!comment) throw Object.assign(new Error('Comment not found'), { statusCode: 404 });
  if (comment.user_id !== userId) throw Object.assign(new Error('You can only delete your own comments'), { statusCode: 403 });
  await commentRepository.remove(commentId);
};
