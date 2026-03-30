import type { LangSmithRun } from "./evidence";

type RunsQueryResponse = {
  runs?: Array<{
    id?: string;
    name?: string;
    run_type?: string;
    start_time?: string;
    end_time?: string;
    error?: string | null;
    extra?: { metadata?: Record<string, unknown> };
  }>;
};

export async function fetchLangSmithRunsForThread(
  threadId: string,
  limit = 50,
): Promise<LangSmithRun[]> {
  const apiKey = process.env.LANGSMITH_API_KEY;
  const endpoint =
    process.env.LANGSMITH_ENDPOINT ?? "https://api.smith.langchain.com";
  const project = process.env.LANGSMITH_PROJECT;
  if (!apiKey || !project) {
    return [];
  }

  const res = await fetch(`${endpoint.replace(/\/$/, "")}/runs/query`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      project_name: project,
      limit,
      filter: `and(eq(metadata_key, "thread_id"), eq(metadata_value, "${threadId}"))`,
    }),
  });
  if (!res.ok) {
    throw new Error(`LangSmith query failed (${res.status})`);
  }
  const json = (await res.json()) as RunsQueryResponse;
  return (json.runs ?? [])
    .filter((run): run is Required<Pick<LangSmithRun, "id">> & LangSmithRun =>
      typeof run.id === "string",
    )
    .map((run) => ({
      id: run.id,
      name: run.name,
      run_type: run.run_type,
      start_time: run.start_time,
      end_time: run.end_time,
      error: run.error,
      extra: run.extra,
    }));
}
