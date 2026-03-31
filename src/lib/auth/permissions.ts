import type { OperatorRole } from "./types";

export type Permission =
  | "ui:access"
  | "mission:run"
  | "approval:decide"
  | "audit:evidence:read"
  | "health:read";

const ROLE_PERMISSIONS: Record<OperatorRole, Permission[]> = {
  viewer: ["ui:access"],
  analyst: ["ui:access", "mission:run", "approval:decide"],
  admin: [
    "ui:access",
    "mission:run",
    "approval:decide",
    "audit:evidence:read",
    "health:read",
  ],
};

export function permissionsForRole(role: OperatorRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(
  role: OperatorRole,
  permission: Permission,
): boolean {
  return permissionsForRole(role).includes(permission);
}
