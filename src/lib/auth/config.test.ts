import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getOperators } from "./config";

const originalEnv = { ...process.env };

describe("auth config", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("rejects duplicate usernames", () => {
    process.env.AUTH_OPERATORS_JSON = JSON.stringify([
      { username: "admin", password: "StrongPass123!", role: "admin" },
      { username: "admin", password: "StrongPass123!", role: "viewer" },
    ]);

    expect(() => getOperators()).toThrow(/Duplicate username/);
  });

  it("rejects weak default password in production", () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      AUTH_OPERATORS_JSON: JSON.stringify([
        { username: "admin", password: "ChangeMe!123", role: "admin" },
      ]),
    };

    expect(() => getOperators()).toThrow(/Weak default password/);
  });
});
