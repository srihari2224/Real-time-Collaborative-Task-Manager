// src/services/emailService.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import env from '../config/env.js';
import { logger } from '../utils/logger.js';

const sesClient = new SESClient({
  region: env.aws.ses.region || env.aws.region,
  credentials: {
    accessKeyId: env.aws.ses.accessKeyId || env.aws.accessKeyId,
    secretAccessKey: env.aws.ses.secretAccessKey || env.aws.secretAccessKey,
  },
});

export const sendTaskAssignedEmail = async (data: {
  to: string;
  assignerName: string;
  taskTitle: string;
  dueDate?: Date | string | null;
}) => {
  const { to, assignerName, taskTitle, dueDate } = data;
  
  if (!env.aws.ses.fromEmail) {
    logger.warn('SES_FROM_EMAIL not configured, skipping email notification');
    return;
  }

  const subject = `New Task Assigned: ${taskTitle}`;
  const body = `
    <div style="font-family: sans-serif; padding: 20px; color: #333;">
      <h2>Hello!</h2>
      <p><strong>${assignerName}</strong> has assigned a new task to you on TaskFlow.</p>
      <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">
        <p style="margin: 0; font-size: 18px; font-weight: bold;">${taskTitle}</p>
        ${dueDate ? `<p style="margin: 10px 0 0; color: #666;">Due Date: ${new Date(dueDate).toLocaleDateString()}</p>` : ''}
      </div>
      <p>Log in to your dashboard to view the details.</p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="font-size: 12px; color: #999;">This is an automated notification from TaskFlow.</p>
    </div>
  `;

  try {
    const command = new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Body: {
          Html: { Data: body, Charset: 'UTF-8' },
        },
        Subject: { Data: subject, Charset: 'UTF-8' },
      },
      Source: `"${env.aws.ses.fromName || 'TaskFlow'}" <${env.aws.ses.fromEmail}>`,
    });

    await sesClient.send(command);
    logger.info({ to, taskTitle }, 'Task assignment email sent successfully');
  } catch (err) {
    logger.error({ err, to }, 'Failed to send task assignment email via SES');
  }
};
