// src/config/s3.js
// AWS S3 client for file storage (uploads, presigned URLs, deletes)

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

export const s3Client = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey,
  },
});

const BUCKET = env.aws.s3.bucketName;
const EXPIRY = env.aws.s3.presignedUrlExpiry;

/**
 * Upload a file buffer to S3
 * @param {string} key - S3 object key (e.g. "attachments/task-123/file.pdf")
 * @param {Buffer} body - File buffer
 * @param {string} contentType - MIME type
 * @param {Object} [metadata] - Optional S3 metadata
 * @returns {Promise<string>} Public URL of uploaded file
 */
export const uploadFile = async (key, body, contentType, metadata = {}) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
      // ACL: 'private', // Use bucket policy + presigned URLs for access
    });

    await s3Client.send(command);
    const url = `${env.aws.s3.bucketUrl}/${key}`;
    logger.info({ key, contentType }, '✅ File uploaded to S3');
    return url;
  } catch (err) {
    logger.error({ err, key }, 'S3 upload failed');
    throw err;
  }
};

/**
 * Generate a presigned download URL (time-limited)
 * @param {string} key - S3 object key
 * @param {number} [expiresIn] - Seconds until expiry (default: from env)
 * @returns {Promise<string>} Presigned URL
 */
export const getPresignedUrl = async (key, expiresIn = EXPIRY) => {
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (err) {
    logger.error({ err, key }, 'Failed to generate presigned URL');
    throw err;
  }
};

/**
 * Generate a presigned upload URL (for direct browser uploads)
 * @param {string} key - S3 object key
 * @param {string} contentType - MIME type
 * @param {number} [expiresIn] - Seconds until expiry
 * @returns {Promise<string>} Presigned PUT URL
 */
export const getPresignedUploadUrl = async (key, contentType, expiresIn = EXPIRY) => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (err) {
    logger.error({ err, key }, 'Failed to generate presigned upload URL');
    throw err;
  }
};

/**
 * Delete a file from S3
 * @param {string} key - S3 object key
 */
export const deleteFile = async (key) => {
  try {
    const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
    await s3Client.send(command);
    logger.info({ key }, '✅ File deleted from S3');
  } catch (err) {
    logger.error({ err, key }, 'S3 delete failed');
    throw err;
  }
};

/**
 * Build the S3 object key for different entity types
 */
export const buildS3Key = {
  attachment: (taskId, filename) => `attachments/${taskId}/${Date.now()}-${filename}`,
  chatFile: (taskId, filename) => `chat-files/${taskId}/${Date.now()}-${filename}`,
  avatar: (userId, filename) => `avatars/${userId}/${Date.now()}-${filename}`,
  workspaceLogo: (workspaceId, filename) => `logos/${workspaceId}/${Date.now()}-${filename}`,
};

export default { s3Client, uploadFile, getPresignedUrl, getPresignedUploadUrl, deleteFile, buildS3Key };
