export type LangSmithRun = {
  id: string;
  name?: string;
  run_type?: string;
  start_time?: string;
  end_time?: string;
  error?: string | null;
  extra?: {
    metadata?: Record<string, unknown>;
  };
};

export type EvidencePackageInput = {
  missionId: string;
  threadId: string;
  requestId: string;
  generatedAt: string;
  runs: LangSmithRun[];
  warnings?: string[];
};

export type EvidencePackage = {
  version: 1;
  mission_id: string;
  thread_id: string;
  request_id: string;
  generated_at: string;
  trace_correlation: {
    mission_id: string;
    thread_id: string;
    request_id: string;
  };
  traces: Array<{
    run_id: string;
    name: string;
    type: string;
    status: "ok" | "error";
    started_at: string | null;
    ended_at: string | null;
    metadata: Record<string, unknown>;
  }>;
  warnings: string[];
};

export function buildEvidencePackage(
  input: EvidencePackageInput,
): EvidencePackage {
  const traces = input.runs.map((run) => ({
    run_id: run.id,
    name: run.name ?? "unknown",
    type: run.run_type ?? "unknown",
    status: run.error ? ("error" as const) : ("ok" as const),
    started_at: run.start_time ?? null,
    ended_at: run.end_time ?? null,
    metadata: {
      ...(run.extra?.metadata ?? {}),
      mission_id: input.missionId,
      thread_id: input.threadId,
      request_id: input.requestId,
    },
  }));

  return {
    version: 1,
    mission_id: input.missionId,
    thread_id: input.threadId,
    request_id: input.requestId,
    generated_at: input.generatedAt,
    trace_correlation: {
      mission_id: input.missionId,
      thread_id: input.threadId,
      request_id: input.requestId,
    },
    traces,
    warnings: input.warnings ?? [],
  };
}
