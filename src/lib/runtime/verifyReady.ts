type HealthDependency = "ok" | "missing" | "error" | "degraded";

export type HealthPayload = {
  status: "ok" | "degraded";
  dependencies: {
    redis: HealthDependency;
    vector: HealthDependency;
    langsmith: HealthDependency;
  };
};

export function isHealthAcceptable(
  body: HealthPayload,
  targetEnv: "production" | "non-production",
): boolean {
  if (targetEnv === "production") {
    return (
      body.status === "ok" &&
      body.dependencies.redis === "ok" &&
      body.dependencies.vector === "ok"
    );
  }

  return body.dependencies.redis !== "error" && body.dependencies.vector !== "error";
}
