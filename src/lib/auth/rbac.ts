import type { OperatorRole } from "./types";

const roleRank: Record<OperatorRole, number> = {
  viewer: 1,
  analyst: 2,
  admin: 3,
};

export function hasMinRole(
  current: OperatorRole,
  required: OperatorRole,
): boolean {
  return roleRank[current] >= roleRank[required];
}
