import type { OperatorRole } from "./types";

const roleRank: Record<OperatorRole, number> = {
  viewer: 1,
  analyst: 2,
  admin: 3,
};

// Implemented but not yet wired to route guards — per-route minimum-role enforcement is a planned hardening item.
// See docs/HARDENING_ROADMAP.md §E.
export function hasMinRole(current: OperatorRole, required: OperatorRole): boolean {
  return roleRank[current] >= roleRank[required];
}
