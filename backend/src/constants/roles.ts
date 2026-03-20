// src/constants/roles.ts
import type { Role } from '../types/index.js';

export const ROLES: Record<string, Role> = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest',
}) as Record<string, Role>;

export const ROLE_HIERARCHY: Role[] = ['guest', 'member', 'admin', 'owner'];

export const hasMinimumRole = (userRole: Role, requiredRole: Role): boolean => {
  return ROLE_HIERARCHY.indexOf(userRole) >= ROLE_HIERARCHY.indexOf(requiredRole);
};

export const PERMISSIONS: Record<string, Role[]> = Object.freeze({
  MANAGE_WORKSPACE:   ['owner'],
  INVITE_MEMBERS:     ['owner', 'admin'],
  MANAGE_PROJECTS:    ['owner', 'admin'],
  CREATE_EDIT_TASKS:  ['owner', 'admin', 'member'],
  DELETE_OWN_TASKS:   ['owner', 'admin', 'member'],
  DELETE_ANY_TASKS:   ['owner', 'admin'],
  USE_TASK_CHAT:      ['owner', 'admin', 'member', 'guest'],
  VIEW_ALL_PROJECTS:  ['owner', 'admin', 'member'],
});

export const can = (role: Role, permission: string): boolean =>
  (PERMISSIONS[permission] ?? []).includes(role);

export default { ROLES, ROLE_HIERARCHY, hasMinimumRole, PERMISSIONS, can };
