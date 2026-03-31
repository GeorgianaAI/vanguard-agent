import { describe, expect, it } from "vitest";
import { hasPermission, permissionsForRole } from "./permissions";

describe("permissions", () => {
  it("viewer has only ui access", () => {
    expect(permissionsForRole("viewer")).toEqual(["ui:access"]);
    expect(hasPermission("viewer", "mission:run")).toBe(false);
  });

  it("analyst can run mission and decide approval", () => {
    expect(hasPermission("analyst", "mission:run")).toBe(true);
    expect(hasPermission("analyst", "approval:decide")).toBe(true);
    expect(hasPermission("analyst", "audit:evidence:read")).toBe(false);
  });

  it("admin has audit read", () => {
    expect(hasPermission("admin", "audit:evidence:read")).toBe(true);
  });
});
