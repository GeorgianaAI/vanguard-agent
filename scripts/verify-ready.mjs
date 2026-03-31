#!/usr/bin/env node

const baseUrl = (process.env.VERIFY_READY_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
const target = process.env.VERIFY_TARGET_ENV === "production" ? "production" : "non-production";
const shouldRunHitlSmoke = process.env.VERIFY_HITL_SMOKE === "true";

function isAcceptable(body, envTarget) {
  if (envTarget === "production") {
    return (
      body?.status === "ok" &&
      body?.dependencies?.redis === "ok" &&
      body?.dependencies?.vector === "ok"
    );
  }

  return body?.dependencies?.redis !== "error" && body?.dependencies?.vector !== "error";
}

async function run() {
  const healthRes = await fetch(`${baseUrl}/api/health`, {
    headers: { "x-request-id": "verify-ready-health" },
  });
  const healthBody = await healthRes.json();
  if (!healthRes.ok || !isAcceptable(healthBody, target)) {
    console.error("[verify-ready] Health check failed", {
      statusCode: healthRes.status,
      status: healthBody?.status,
      dependencies: healthBody?.dependencies,
      target,
    });
    process.exit(1);
  }

  if (shouldRunHitlSmoke) {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-request-id": "verify-ready-hitl" },
      body: JSON.stringify({
        isApproval: true,
        thread_id: "verify-ready-smoke",
      }),
    });
    if (res.status >= 500) {
      console.error("[verify-ready] HITL smoke failed with 5xx", { statusCode: res.status });
      process.exit(1);
    }
  }

  console.log(`[verify-ready] OK (${target})`);
}

run().catch((error) => {
  console.error("[verify-ready] Failed", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
