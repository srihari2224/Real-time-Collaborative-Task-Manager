// src/middlewares/requireRole.ts
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Role } from '../types/index.js';
import { hasMinimumRole } from '../constants/roles.js';
import { forbidden } from '../utils/apiResponse.js';
import * as workspaceRepository from '../repositories/workspaceRepository.js';

export const requireRole = (minRole: Role) => async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
  const params = req.params as Record<string, string>;
  const workspaceId = params.workspaceId ?? params.id;
  if (!workspaceId) return;

  const userId = req.user?.id;
  if (!userId) return forbidden(reply, 'Authentication required') as unknown as void;

  const member = await workspaceRepository.getMember(workspaceId, userId);
  if (!member) return forbidden(reply, 'You are not a member of this workspace') as unknown as void;
  if (!hasMinimumRole(member.role, minRole)) {
    return forbidden(reply, `This action requires at least the '${minRole}' role`) as unknown as void;
  }
  req.workspaceMember = member;
};

export default requireRole;
