// src/config/s3.ts
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
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

export const uploadFile = async (
  key: string,
  body: Buffer,
  contentType: string,
  metadata: Record<string, string> = {}
): Promise<string> => {
  try {
    await s3Client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType, Metadata: metadata }));
    const url = `${env.aws.s3.bucketUrl}/${key}`;
    logger.info({ key, contentType }, '✅ File uploaded to S3');
    return url;
  } catch (err) {
    logger.error({ err, key }, 'S3 upload failed');
    throw err;
  }
};

export const getPresignedUrl = async (key: string, expiresIn = EXPIRY): Promise<string> => {
  try {
    return await getSignedUrl(s3Client, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
  } catch (err) {
    logger.error({ err, key }, 'Failed to generate presigned URL');
    throw err;
  }
};

export const deleteFile = async (key: string): Promise<void> => {
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    logger.info({ key }, '✅ File deleted from S3');
  } catch (err) {
    logger.error({ err, key }, 'S3 delete failed');
    throw err;
  }
};

export const buildS3Key = {
  attachment: (taskId: string, filename: string) => `attachments/${taskId}/${Date.now()}-${filename}`,
  chatFile: (taskId: string, filename: string) => `chat-files/${taskId}/${Date.now()}-${filename}`,
  avatar: (userId: string, filename: string) => `avatars/${userId}/${Date.now()}-${filename}`,
  workspaceLogo: (workspaceId: string, filename: string) => `logos/${workspaceId}/${Date.now()}-${filename}`,
};

export default { s3Client, uploadFile, getPresignedUrl, deleteFile, buildS3Key };
