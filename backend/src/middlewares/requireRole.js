// src/middlewares/requireRole.js
// Role-based access control preHandler factory

import { hasMinimumRole } from '../constants/roles.js';
import { forbidden } from '../utils/apiResponse.js';
import * as workspaceRepository from '../repositories/workspaceRepository.js';

/**
 * Factory — returns a Fastify preHandler that ensures the
 * authenticated user has at least `minRole` in the workspace.
 *
 * Workspace ID is read from req.params.workspaceId or req.params.id
 * depending on the route.
 *
 * @param {string} minRole - 'guest' | 'member' | 'admin' | 'owner'
 */
export const requireRole = (minRole) => async (req, reply) => {
  const workspaceId = req.params.workspaceId || req.params.id;
  if (!workspaceId) return; // Route doesn't use workspace context

  const userId = req.user?.id;
  if (!userId) return forbidden(reply, 'Authentication required');

  const member = await workspaceRepository.getMember(workspaceId, userId);
  if (!member) return forbidden(reply, 'You are not a member of this workspace');

  if (!hasMinimumRole(member.role, minRole)) {
    return forbidden(reply, `This action requires at least the '${minRole}' role`);
  }

  req.workspaceMember = member;
};

export default requireRole;
