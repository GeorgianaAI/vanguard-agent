# 📘 Vanguard Agent: Operations Runbook

## Health endpoint semantics

- `GET /api/health` returns `200` with `status=ok` or `status=degraded` in non-production.
- `GET /api/health` returns `503` in production when critical dependencies (`redis`, `vector`) are `missing` or `error`.
- Dependency states:
  - `ok`: probe succeeded.
  - `missing`: required config not present.
  - `error`: probe failed or timed out.
  - `degraded` (LangSmith only): optional telemetry config omitted in non-production.

## Common failure modes

- Redis:
  - missing env vars
  - auth failure / network timeout
- Vector:
  - missing env vars
  - auth failure / service timeout
- LangSmith:
  - missing key/project in non-production (degraded)
  - API failure in any environment (error)

## Red-Team Mode Usage

- `REDTEAM_MODE=true` enables isolated red-team runtime behavior for controlled adversarial runs.
- Optional isolation controls:
  - `RED_TEAM_VECTOR_NAMESPACE` (vector memory namespace partition)
  - `RED_TEAM_THREAD_PREFIX` (thread ID prefix partition)
- This section is **optional** and **not required for standard setup**.
- Keep red-team mode **off** for normal operator usage and production user traffic.
- Enable red-team mode only for:
  - dedicated red-team test runs
  - CI adversarial suites
  - governance/evidence capture workflows
- In local `.env.local`, keep red-team vars as commented templates and enable only when needed.
- In CI, scope red-team vars to the specific red-team job/environment (not global pipeline defaults).
- If behavior looks unexpectedly isolated or non-standard, first verify whether `REDTEAM_MODE` was accidentally enabled.

### Red-team env example (maintainers only, optional)

Use only for controlled red-team runs (local security testing or CI red-team job):

```env
REDTEAM_MODE=true
RED_TEAM_VECTOR_NAMESPACE=redteam-ci-0000000001
RED_TEAM_THREAD_PREFIX=redteam-ci
```

## Immediate remediation

1. Check `GET /api/health` and capture `x-request-id` from the response headers.
2. Inspect logs for structured `vanguard.api.health` events with matching `reqId`.
3. For `missing`:
   - verify deploy env vars are present and correctly scoped.
   - run `npm run verify:env` in the target environment context.
4. For `error`:
   - validate upstream service status (Upstash, LangSmith).
   - retry after transient outage clears.
5. In production, if `redis` or `vector` is not `ok`, block or rollback deploy.

## Fail/rollback guidance

- **Fail deployment** when production health is `degraded` because of Redis/Vector.
- **Allow deployment with caution** when only LangSmith is degraded in non-production.
- **Rollback immediately** when post-deploy production health changes from `ok` to `degraded` for critical dependencies.

## Where to look

- Health endpoint: `/api/health`
- Structured runtime logs: `component=vanguard.api.health`
- CI checks (build-time, no server required): `npm run verify:env`, test and e2e jobs
- Post-deploy check (manual, requires a running deployment): `VERIFY_READY_BASE_URL=<vercel-url> npm run verify:ready`
