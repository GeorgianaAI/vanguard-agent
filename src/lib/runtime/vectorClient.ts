import { Index } from "@upstash/vector";
import { isRedTeamMode, resolveVectorEnv } from "./redteam";

type EnvSource = Record<string, string | undefined>;

export function getVectorRuntimeConfig(env: EnvSource = process.env) {
  return resolveVectorEnv(env);
}

export function createVectorIndex() {
  const cfg = resolveVectorEnv();
  if (!cfg.url || !cfg.token) {
    return null;
  }
  return new Index({
    url: cfg.url,
    token: cfg.token,
  });
}

type VectorQueryResult = { id?: string; metadata?: { thread_id?: string } };

type VectorClientLike = {
  upsert: (vectors: unknown[], opts?: { namespace?: string }) => Promise<unknown>;
  query: (
    params: Record<string, unknown>,
    opts?: { namespace?: string },
  ) => Promise<VectorQueryResult[]>;
  delete: (ids: string | string[], opts?: { namespace?: string }) => Promise<unknown>;
};

export async function runVectorNamespaceProbe(
  threadId: string,
  env: EnvSource = process.env,
  injectedIndex?: VectorClientLike | null,
): Promise<{ namespace: string; verified: boolean; skipped: boolean }> {
  const cfg = getVectorRuntimeConfig(env);
  const index = injectedIndex === undefined ? createVectorIndex() : injectedIndex;
  if (!index || !isRedTeamMode(env)) {
    return { namespace: cfg.namespace, verified: false, skipped: true };
  }

  const markerId = `vanguard-probe-${threadId}`;
  const markerData = `probe:${threadId}`;
  await index.upsert(
    [
      {
        id: markerId,
        data: markerData,
        metadata: {
          thread_id: threadId,
          purpose: "redteam-namespace-probe",
        },
      },
    ],
    { namespace: cfg.namespace },
  );
  const results = await index.query(
    {
      data: markerData,
      topK: 1,
      includeMetadata: true,
    },
    { namespace: cfg.namespace },
  );
  await index.delete(markerId, { namespace: cfg.namespace });

  const verified = Array.isArray(results)
    ? results.some(
        (item) => item.id === markerId || item.metadata?.thread_id === threadId,
      )
    : false;

  return { namespace: cfg.namespace, verified, skipped: false };
}
