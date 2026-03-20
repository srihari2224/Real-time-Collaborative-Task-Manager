// src/constants/roles.js
// Workspace member roles

export const ROLES = Object.freeze({
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest',
});

// Role hierarchy (higher index = more permissions)
export const ROLE_HIERARCHY = [ROLES.GUEST, ROLES.MEMBER, ROLES.ADMIN, ROLES.OWNER];

/**
 * Check if a role has at least the required minimum role
 * @param {string} userRole
 * @param {string} requiredRole
 */
export const hasMinimumRole = (userRole, requiredRole) => {
  const userLevel = ROLE_HIERARCHY.indexOf(userRole);
  const requiredLevel = ROLE_HIERARCHY.indexOf(requiredRole);
  return userLevel >= requiredLevel;
};

// Permission matrix
export const PERMISSIONS = Object.freeze({
  MANAGE_WORKSPACE: [ROLES.OWNER],
  INVITE_MEMBERS: [ROLES.OWNER, ROLES.ADMIN],
  MANAGE_PROJECTS: [ROLES.OWNER, ROLES.ADMIN],
  CREATE_EDIT_TASKS: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
  DELETE_OWN_TASKS: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
  DELETE_ANY_TASKS: [ROLES.OWNER, ROLES.ADMIN],
  USE_TASK_CHAT: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.GUEST],
  VIEW_ALL_PROJECTS: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER],
});

/**
 * Check if a role has a specific permission
 */
export const can = (role, permission) => {
  const allowed = PERMISSIONS[permission] || [];
  return allowed.includes(role);
};

export default { ROLES, ROLE_HIERARCHY, hasMinimumRole, PERMISSIONS, can };
