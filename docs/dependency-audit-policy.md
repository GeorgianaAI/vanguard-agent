# Dependency audit policy

- **CI:** `npm audit --audit-level=high` runs on every push/PR. Only **high** and **critical** severities fail the build.
- **Moderate/low:** triaged periodically; apply `npm audit fix` when safe, or record accepted risk in this repo’s issue tracker with mitigation and review date.
- **Scope:** Root `package.json` / `package-lock.json`. The `mcp-server/` package is built separately in CI (`mcp-server` job).

Rationale: failing on every moderate advisory (often transitive) creates brittle CI without a documented exception process. High+ aligns with shipping velocity while keeping serious issues visible.
