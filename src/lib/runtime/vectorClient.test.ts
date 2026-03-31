import { describe, expect, it } from "vitest";
import { getVectorRuntimeConfig, runVectorNamespaceProbe } from "./vectorClient";

describe("vector runtime config wiring", () => {
  it("uses default namespace when redteam mode is disabled", () => {
    const cfg = getVectorRuntimeConfig({
      REDTEAM_MODE: "false",
      UPSTASH_VECTOR_NAMESPACE: "vanguard-default",
    });
    expect(cfg.namespace).toBe("vanguard-default");
  });

  it("resolves red-team vector namespace via runtime helper", () => {
    const cfg = getVectorRuntimeConfig({
      REDTEAM_MODE: "true",
      CI: "true",
      UPSTASH_VECTOR_REST_URL: "https://vector",
      UPSTASH_VECTOR_REST_TOKEN: "token",
    });
    expect(cfg.namespace).toBe("redteam-ci-0000000001");
  });

  it("writes/queries/deletes in red-team namespace only", async () => {
    const store = new Map<string, Map<string, string>>();
    const fakeIndex = {
      async upsert(vectors: unknown[], opts?: { namespace?: string }) {
        const ns = opts?.namespace ?? "default";
        const nsMap = store.get(ns) ?? new Map<string, string>();
        for (const vector of vectors as Array<{ id: string; data: string }>) {
          nsMap.set(vector.id, vector.data);
        }
        store.set(ns, nsMap);
      },
      async query(
        params: Record<string, unknown>,
        opts?: { namespace?: string },
      ) {
        const ns = opts?.namespace ?? "default";
        const nsMap = store.get(ns) ?? new Map<string, string>();
        const data = String(params.data ?? "");
        const hit = [...nsMap.entries()].find(([, value]) => value === data);
        return hit ? [{ id: hit[0], metadata: { thread_id: "rt-1" } }] : [];
      },
      async delete(ids: string | string[], opts?: { namespace?: string }) {
        const ns = opts?.namespace ?? "default";
        const nsMap = store.get(ns) ?? new Map<string, string>();
        for (const id of Array.isArray(ids) ? ids : [ids]) {
          nsMap.delete(id);
        }
      },
    };

    const env = {
      REDTEAM_MODE: "true",
      RED_TEAM_VECTOR_NAMESPACE: "redteam-ci-0000000001",
    };
    const result = await runVectorNamespaceProbe("rt-1", env, fakeIndex);
    expect(result.namespace).toBe("redteam-ci-0000000001");
    expect(result.verified).toBe(true);
    expect(result.skipped).toBe(false);
  });

  it("does not leak into default namespace", async () => {
    const store = new Map<string, Map<string, string>>();
    const fakeIndex = {
      async upsert(vectors: unknown[], opts?: { namespace?: string }) {
        const ns = opts?.namespace ?? "default";
        const nsMap = store.get(ns) ?? new Map<string, string>();
        for (const vector of vectors as Array<{ id: string; data: string }>) {
          nsMap.set(vector.id, vector.data);
        }
        store.set(ns, nsMap);
      },
      async query(
        params: Record<string, unknown>,
        opts?: { namespace?: string },
      ) {
        const ns = opts?.namespace ?? "default";
        const nsMap = store.get(ns) ?? new Map<string, string>();
        const data = String(params.data ?? "");
        const hit = [...nsMap.entries()].find(([, value]) => value === data);
        return hit ? [{ id: hit[0], metadata: { thread_id: "rt-2" } }] : [];
      },
      async delete(ids: string | string[], opts?: { namespace?: string }) {
        const ns = opts?.namespace ?? "default";
        const nsMap = store.get(ns) ?? new Map<string, string>();
        for (const id of Array.isArray(ids) ? ids : [ids]) {
          nsMap.delete(id);
        }
      },
    };

    await runVectorNamespaceProbe(
      "rt-2",
      {
        REDTEAM_MODE: "true",
        RED_TEAM_VECTOR_NAMESPACE: "redteam-ci-0000000001",
      },
      fakeIndex,
    );

    const defaultNamespaceQuery = await fakeIndex.query(
      { data: "probe:rt-2" },
      { namespace: "vanguard-default" },
    );
    expect(defaultNamespaceQuery).toEqual([]);
  });
});
