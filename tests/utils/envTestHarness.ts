import { afterEach, beforeEach } from "vitest";

/**
 * Standardized env reset/restore for test suites.
 * Call inside describe() once per file.
 */
export function useEnvTestHarness() {
  const originalEnv: NodeJS.ProcessEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  return {
    setEnv(patch: Partial<NodeJS.ProcessEnv>) {
      process.env = { ...process.env, ...patch };
    },
    unsetEnv(...keys: (keyof NodeJS.ProcessEnv | string)[]) {
      for (const k of keys) {
        delete process.env[k as keyof NodeJS.ProcessEnv];
      }
    },
  };
}
