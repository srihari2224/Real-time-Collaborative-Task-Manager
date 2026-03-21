// src/validators/schemas.ts
import Joi from 'joi';

const uuid = Joi.string().uuid();

export const createWorkspaceSchema = { body: Joi.object({ name: Joi.string().min(1).max(100).required(), description: Joi.string().max(500).optional().allow('') }) };
export const updateWorkspaceSchema = { body: Joi.object({ name: Joi.string().min(1).max(100).optional(), description: Joi.string().max(500).optional().allow(''), logo_url: Joi.string().uri().optional() }) };
export const inviteMemberSchema = { body: Joi.object({ email: Joi.string().email().required(), role: Joi.string().valid('admin', 'member', 'guest').default('member') }) };

export const createProjectSchema = { body: Joi.object({ workspace_id: uuid.required(), name: Joi.string().min(1).max(100).required(), description: Joi.string().max(500).optional().allow(''), color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional() }) };
export const updateProjectSchema = { body: Joi.object({ name: Joi.string().min(1).max(100).optional(), description: Joi.string().max(500).optional().allow(''), color: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/).optional() }) };

export const createTaskSchema = {
  body: Joi.object({
    project_id: uuid.required(), title: Joi.string().min(1).max(255).required(),
    description: Joi.string().max(5000).optional().allow(''),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
    // Multi-assignees: either UUIDs or emails (controller resolves emails -> UUIDs)
    assignee_ids: Joi.array().items(uuid).optional(),
    assignee_emails: Joi.array().items(Joi.string().email()).optional(),
    due_date: Joi.date().iso().optional().allow(null),
  }),
};
export const updateTaskSchema = {
  body: Joi.object({
    title: Joi.string().min(1).max(255).optional(), description: Joi.string().max(5000).optional().allow(''),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
    assignee_ids: Joi.array().items(uuid).optional(),
    due_date: Joi.date().iso().optional().allow(null),
    position: Joi.number().integer().min(0).optional(),
  }),
};
export const taskQuerySchema = {
  querystring: Joi.object({
    status: Joi.string().valid('todo', 'in_progress', 'in_review', 'done', 'cancelled').optional(),
    priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
    // Backend uses `assignee_user_id` to filter tasks by a specific assignee.
    assignee_user_id: uuid.optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
};
export const createCommentSchema = { body: Joi.object({ content: Joi.string().min(1).max(5000).required() }) };
