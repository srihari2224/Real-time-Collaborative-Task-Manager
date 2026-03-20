// src/services/fileService.ts
import type { MultipartFile } from '@fastify/multipart';
import type { Attachment } from '../types/index.js';
import { uploadFile, deleteFile, getPresignedUrl, buildS3Key } from '../config/s3.js';
import * as attachmentRepository from '../repositories/attachmentRepository.js';
import { env } from '../config/env.js';

export const uploadAttachment = async (userId: string, taskId: string, file: MultipartFile): Promise<Attachment> => {
  const allowed = env.upload.allowedFileTypes;
  if (!allowed.includes(file.mimetype)) {
    throw Object.assign(new Error(`File type '${file.mimetype}' is not allowed`), { statusCode: 400 });
  }
  const buffer = await file.toBuffer();
  const maxBytes = env.upload.maxFileSizeMb * 1024 * 1024;
  if (buffer.length > maxBytes) {
    throw Object.assign(new Error(`File exceeds max size of ${env.upload.maxFileSizeMb}MB`), { statusCode: 400 });
  }
  const key = buildS3Key.attachment(taskId, file.filename);
  const url = await uploadFile(key, buffer, file.mimetype);
  return attachmentRepository.create({ task_id: taskId, uploaded_by: userId, filename: file.filename, s3_key: key, url, mime_type: file.mimetype, size_bytes: buffer.length });
};

export const getAttachments = (taskId: string) => attachmentRepository.findByTask(taskId);

export const removeAttachment = async (attachmentId: string, userId: string): Promise<void> => {
  const attachment = await attachmentRepository.findById(attachmentId);
  if (!attachment) throw Object.assign(new Error('Attachment not found'), { statusCode: 404 });
  if (attachment.uploaded_by !== userId) throw Object.assign(new Error('You can only delete your own attachments'), { statusCode: 403 });
  await deleteFile(attachment.s3_key);
  await attachmentRepository.remove(attachmentId);
};

export const getPresignedDownloadUrl = async (attachmentId: string): Promise<string> => {
  const attachment = await attachmentRepository.findById(attachmentId);
  if (!attachment) throw Object.assign(new Error('Attachment not found'), { statusCode: 404 });
  return getPresignedUrl(attachment.s3_key);
};
