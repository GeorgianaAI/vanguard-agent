# Operations Runbook

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
- CI checks: `npm run verify:env`, `npm run verify:ready`, test and e2e jobs
