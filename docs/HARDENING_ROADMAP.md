# 🛰️🛡️ Vanguard Hardening Roadmap

## Purpose

This document captures production hardening considerations for Vanguard across core AI engineering competencies.
It distinguishes what is implemented today from what is planned or intentionally deferred.

The goal is to make technical trade-offs explicit: Vanguard prioritizes governed autonomous reconnaissance and auditability over full enterprise platform breadth in this milestone.

---

## Scope and Positioning

Vanguard prioritizes:

- governed multi-agent execution (Supervisor / Scout / Auditor),
- Human-in-the-Loop (HITL) authorization at tool boundaries,
- traceable governance evidence for compliance-oriented workflows.

Cross-cutting enterprise operations maturity is partially implemented and intentionally staged.

Legend used in this file:

- **Implemented**: already present in the project
- **Planned**: recommended near-term additions (high value, low-to-medium lift)
- **Deferred**: recognized and intentionally out of current milestone scope

---

## 7-Skill Maturity Snapshot

### 1) System Design

- **Status:** Implemented (Strong)
- **Evidence:** LangGraph stateful orchestration, Supervisor/Scout/Auditor flow, checkpointed mission lifecycle, governance-aware execution model.

### 2) Tool and Contract Design

- **Status:** Implemented (Strong)
- **Evidence:** Zod-validated contracts, explicit approval context (tool/args/risk/side effects/expiry), HITL-bound action execution.

### 3) Retrieval Engineering

- **Status:** Implemented (Focused), Planned (Quality hardening)
- **Evidence today:** Tavily + RDAP retrieval, mission-linked evidence correlation, vector-backed knowledge layer.
- **Note:** Retrieval scope is intentionally narrow (defensive OSINT + mission-linked CVE context), not broad generic enterprise RAG.

### 4) Reliability Engineering

- **Status:** Implemented (Strong foundation), Planned (Ops formalization), Deferred (full SRE maturity)
- **Evidence today:** CI/lint/tests/e2e, circuit-breaker loop cap, persistence/recovery, `/api/health` semantics, dependency-oriented operations runbook.
- **Planned:** Inngest durable step functions for mission orchestration (step-level retry, crash recovery, approval-gate pause/resume, daily briefing cron).

### 5) Security and Safety

- **Status:** Implemented (Strong)
- **Evidence:** HITL authorization gate, policy checks, replay/staleness protections, rate limits, red-team/adversarial testing. RBAC role hierarchy modelled; per-route enforcement planned (see §E below).

### 6) Evaluation and Observability

- **Status:** Implemented (Strong foundation), Planned (SLO-linked telemetry)
- **Evidence today:** LangSmith traces, Sentry error monitoring (client/server/Edge), governance ledger/evidence trail, export-ready audit artifacts, test and CI validation.

### 7) Product Thinking

- **Status:** Implemented (Strong for current scope), Deferred (commercial/platform expansion)
- **Evidence today:** clear mission workflow, command center + governance UX, operator-centric control and evidence framing.

---

## Near-Term Hardening

> These are high-value improvements aligned with Vanguard’s current scope and should be prioritized before broader enterprise expansion.

### A) Workflow Durability - Inngest (Skill 4)

Vanguard missions are multi-step, long-running workflows: recon →
analysis → synthesis → brief generation. Without durable orchestration,
a server crash or tool timeout mid-mission loses all prior work and
restarts from zero.

**Without Inngest:**

- ├── Mission crashes at synthesis step → entire mission restarts
- ├── Tavily API timeout → whole recon step fails, no retry
- ├── No visibility into which step failed or where progress stopped
- ├── Long missions (30-60s) block the Next.js route handler or hit the Edge function timeout
- └── No reliable mechanism for scheduled daily threat briefings

**With Inngest:**

- ├── Each mission step (recon, analysis, synthesis, brief) retried independently
- ├── Tavily timeout → only that tool call retries, not the whole mission
- ├── Dashboard visibility into step-level progress and failure reason
- ├── POST /mission/run returns immediately, client polls for progress
- └── Scheduled daily briefings via built-in Inngest cron (no external cron needed)

**Steps to convert Vanguard missions to Inngest functions:**

1. **Mission orchestration function** (`inngest/functions/mission_run.ts`)
   - step 1: `recon` — Tavily web search, store raw results
   - step 2: `analysis` — Claude Sonnet threat analysis per source
   - step 3: `synthesis` — conflict resolution across agent outputs
   - step 4: `brief-generation` — final structured brief
   - step 5: `approval-gate` — pause workflow, wait for human approval
   - step 6: `delivery` — deliver approved brief to requester

2. **Daily briefing cron** (`inngest/functions/daily_brief.ts`)
   - Schedule: `"0 7 * * *"` (7 AM UTC daily)
   - Trigger mission_run for all active threat watch configurations

3. **Approval gate as Inngest pause**
   - Human approval currently implemented as a confirmation modal
   - With Inngest: `await step.waitForEvent("mission/approved", { timeout: "24h" })`
   - Mission pauses mid-workflow, resumes when approval event fires
   - Timeout: if no approval in 24h, mission auto-expires cleanly

**Why this fits Vanguard specifically:**

- ├── OSINT missions are expensive to re-run (Tavily API calls cost per search)
- ├── Step-level retry prevents paying twice for completed recon
- ├── Approval gate maps naturally to Inngest's pause/resume pattern
- └── Daily briefing cron removes dependency on external scheduler

**Priority:** High — mission reliability directly impacts the security
use case. A failed mid-mission with no recovery is a worse user
experience than a slow mission with guaranteed completion.

### B) Retrieval Quality Hardening (Skill 3)

1. **Evidence provenance normalization**
   - Standardize retrieval artifact fields (`source`, `retrievedAt`, `confidence`, `provenanceId`).
2. **Citation-gated synthesis**
   - Require trace-linked evidence for high-confidence claims in final briefs.
3. **Retrieval evaluation harness (small but durable)**
   - Add a fixed mission set and track relevance/groundedness/citation coverage over time.
4. **Freshness + source trust policy**
   - Add lightweight freshness scoring and source trust tiers for retrieved evidence.

### C) Reliability Ops Formalization (Skill 4)

1. **Define explicit SLO starter set**
   - API success rate, p95 latency, mission completion rate, approval-gate integrity.
2. **Error budget policy (minimal)**
   - Document thresholds and temporary change-freeze criteria after budget burn.
3. **Alert mapping from health semantics**
   - Tie `/api/health` dependency states to clear alert actions and escalation ownership.

### E) RBAC Route Enforcement (Skill 5)

The role hierarchy (`viewer=1`, `analyst=2`, `admin=3`) is modelled in `src/lib/auth/rbac.ts` and the role claim is verified in session JWTs (`src/lib/auth/session.ts`). The `hasMinRole()` function exists but is not yet called from any route handler — currently all valid sessions can reach all endpoints regardless of role.

**What needs to be done:**

1. Add a `requireRole(req, minRole)` helper to `app/api/_shared/requestGuards.ts` that:
   - Reads the `__Host-vanguard-session` cookie from the request
   - Calls `verifySessionToken()` to get the claims
   - Calls `hasMinRole(claims.role, minRole)` — returns 403 if insufficient
2. Wire it into routes with the appropriate minimum role:
   - `POST /api/chat` (mission start + approval) → `analyst`
   - `GET /api/audit/evidence` → `admin`
   - `GET /api/governance` and read-only routes → `viewer`
3. Update Playwright E2E tests to cover role rejection (403) paths

**Why deferred:** The current deployment uses a single demo account, so enforcement provides no practical access boundary today. Implementing it before multi-role user management exists adds test surface with no operational benefit. This becomes a blocking requirement before any multi-user or production deployment.

**Priority:** Medium — required before any multi-user deployment; not blocking for single-account demo.

### D) Observability Expansion (Skill 6)

1. **Operational dashboard baseline**
   - Track request volume, error rates, tool failure rates, fallback rates, approval latency.
2. **Correlation completeness**
   - Ensure request/mission IDs are consistently visible across logs/traces/governance artifacts.
3. **Post-incident telemetry review loop**
   - Add a lightweight monthly reliability telemetry review ritual.
4. **Sentry source maps** _(optional near-term)_
   - Add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` to surface real TypeScript line numbers in Sentry stack traces instead of minified output.

---

## Deferred Hardening (Intentional Non-Goals for Current Milestone)

### Reliability / SRE Expansion

- 24/7 on-call program with full paging rotations
- advanced circuit-breaker meshes for all upstream dependencies
- multi-region active-active operational topology

### Incident Program Depth

- full SEV automation stack and incident bot tooling
- formal game-day program across all external dependency classes
- deep customer comms workflow integration

### Retrieval Platform Expansion

- generalized multi-tenant enterprise retrieval fabric
- broad knowledge ingestion pipelines beyond Vanguard mission scope
- large-scale reranking optimization program

### Productization Expansion

- formal ICP/JTBD program and role-to-feature matrix expansion
- packaging/tiering model (Core/Governance/Enterprise)
- commercial lifecycle layers (billing, seat governance, procurement controls)

---

## Detailed Hardening Plan: Skill 3 (Retrieval Engineering)

## Objectives

- Increase evidence grounding quality while preserving Vanguard’s defensive OSINT scope.
- Improve confidence calibration and citation integrity.
- Reduce retrieval-related hallucination risk in mission summaries.

### Planned (Near-Term)

1. **Retrieval artifact contract**
   - enforce normalized metadata and provenance IDs for all retrieved evidence.
2. **Evidence sufficiency gate**
   - downgrade confidence or emit “insufficient evidence” when support is weak.
3. **Claim-to-evidence validation**
   - add a verifier pass that checks summary claims against retrieved sources.
4. **Regression evaluation set**
   - maintain a curated mission corpus for retrieval regressions in CI.

### Deferred

- large-scale hybrid retrieval optimization and dynamic reranking framework
- advanced source reputation graph and global trust scoring service
- full retrieval A/B experimentation platform

### Retrieval Exit Criteria (Current Scope)

- provenance fields enforced for retrieved evidence
- high-confidence claims require linked evidence
- retrieval regression suite runs in CI on representative missions

---

## Detailed Hardening Plan: Skill 4 (Reliability Engineering)

## Objectives

- Make reliability targets explicit and measurable.
- Reduce ambiguity during dependency degradation.
- Improve incident readiness without overextending project scope.

### Planned (Near-Term)

1. **SLO v1 policy**
   - define initial SLI/SLO table and reporting cadence.
2. **Escalation mapping**
   - attach owners/actions to health states (`ok/missing/error/degraded`).
3. **Incident template baseline**
   - add a short incident/postmortem template and minimum response checklist.

### Deferred

- full SRE incident automation ecosystem
- advanced chaos testing program
- global high-availability topology and failover orchestration

### Reliability Exit Criteria (Current Scope)

- SLO v1 documented and referenced by runbook
- health-state escalation rules documented
- incident template available and used for major events

---

## Detailed Hardening Plan: Skill 6 (Evaluation and Observability)

## Objectives

- Connect trace observability to operational reliability decisions.
- Improve detection speed for regressions and dependency failures.
- Maintain audit-grade visibility aligned with governance posture.

### Planned (Near-Term)

1. **Ops metrics baseline**
   - error/latency/tool-failure/approval-latency metrics with simple dashboard.
2. **Alert thresholds**
   - define practical threshold rules tied to SLO and dependency health.
3. **Monthly telemetry review**
   - recurring review of runtime trends and hardening follow-ups.

### Deferred

- full observability data warehouse and long-horizon anomaly detection
- enterprise-wide distributed tracing standardization
- advanced cost/performance optimization automation

### Observability Exit Criteria (Current Scope)

- baseline runtime dashboard exists
- threshold-based alerts documented
- telemetry review cadence established

---

## Detailed Hardening Plan: Inngest Integration (Skill 4 — Reliability)

## Context

Vanguard missions are multi-step, long-running AI pipelines:

```
User requests OSINT report
    ↓
Supervisor: classify intent, assign tools
    ↓
Scout: Tavily web search + RDAP domain lookups
    ↓
Auditor: threat analysis, CVE enrichment
    ↓
Brief generation: structured governance output
    ↓
Approval gate: HITL authorization before delivery
```

At 3–5 agent steps with external API calls, a full mission can run 30–90 seconds.

## Challenge

- ├── A server crash at the Auditor step loses all prior Scout recon — expensive Tavily queries wasted
- ├── Tavily API timeout fails the entire Scout step with no per-query retry
- ├── The Next.js route handler timeout (default 60s) kills long missions mid-flight
- ├── No visibility into which step is running, failed, or waiting on approval
- └── No reliable mechanism for scheduled daily threat briefings without an external cron service

## Why Not Handle This in the Existing Next.js Route

- ├── Route handler timeout kills long recon pipelines regardless of LangGraph state
- ├── LangGraph checkpointing survives state loss but does not retry failed tool calls
- ├── No per-step retry — a Tavily timeout retries the entire Scout node, not the failed query
- └── No dashboard visibility into step progress without building custom streaming infrastructure

## Solution: Inngest

Inngest converts the Vanguard mission pipeline into durable step functions.
Each step is independently retried on failure without restarting completed prior steps.

```
POST /api/chat/ → fires Inngest event: vanguard/mission.run
    ↓
step 1: recon            (Tavily search queries, RDAP lookups — retried per-query)
step 2: analysis         (Claude Sonnet threat analysis per retrieved source)
step 3: synthesis        (Auditor cross-source conflict resolution)
step 4: brief-generation (structured governance artifact)
step 5: approval-gate    (pause workflow, wait for operator HITL approval)
step 6: delivery         (release approved brief, write governance ledger entry)
```

Each step calls `step.run()` — Inngest checkpoints the return value and will not re-execute
a completed step if the function is retried for a later failure.

## What Changes for the Caller

- Before: `POST /api/chat/` streams until the mission completes or the route times out
- After: `POST /api/chat/` returns immediately with `{ missionId, status: "queued" }`
- Client polls `GET /api/chat/[id]/status` for step-level progress
- Approval gate implemented as `await step.waitForEvent("mission/approved", { timeout: "24h" })` — mission pauses mid-workflow and resumes when the operator submits approval; if no approval arrives in 24h the mission auto-expires cleanly

## Approval Gate Mapping

Vanguard's HITL approval model maps naturally to Inngest's pause/resume pattern:

| Current | With Inngest |
| :--- | :--- |
| Approval modal blocks the streaming response | `step.waitForEvent("mission/approved")` pauses the Inngest function |
| Approval timeout handled by client-side timer | Inngest handles timeout, emits expiry event, cleans up state |
| Approval context hash validated in route handler | Hash validation moves into the approval-gate step — same logic, durable execution |

## Daily Threat Briefing Cron

Inngest's built-in schedule replaces any external cron dependency:

```typescript
// inngest/functions/daily_brief.ts
export const dailyBrief = inngest.createFunction(
  { id: "daily-brief" },
  { cron: "0 7 * * *" },  // 07:00 UTC daily
  async ({ step }) => {
    const watchConfigs = await step.run("load-watch-configs", loadActiveWatchConfigs);
    await Promise.all(
      watchConfigs.map((cfg) =>
        step.sendEvent("trigger-mission", { name: "vanguard/mission.run", data: cfg })  // handled by mission_run.ts
      )
    );
  }
);
```

No Vercel function needs to be kept warm. No external cron service.

## New Routes and Files

| What changes | Detail |
| :--- | :--- |
| `POST /api/inngest` | Inngest webhook receiver (new route, ~5 lines) |
| `GET /api/chat/[id]/status` | Step-level progress polling (new route) |
| `inngest/client.ts` | Inngest client instantiation |
| `inngest/functions/mission_run.ts` | Durable mission pipeline function |
| `inngest/functions/daily_brief.ts` | Nightly briefing cron function |
| `POST /api/chat/` | Returns `{ missionId }` immediately instead of streaming |

## What Stays the Same

- ✅ All LangGraph agent logic (`src/lib/agent/`)
- ✅ Approval policy and hash binding (`src/lib/approval/`)
- ✅ RBAC and JWT session model (`src/lib/auth/`)
- ✅ Governance ledger and PDF export (`src/lib/governance/`)
- ✅ Tavily and RDAP retrieval helpers (`src/lib/recon/`)
- ✅ Sentry error monitoring
- ✅ LangSmith traces
- ✅ All existing UI components and the dashboard stream view

## Trade-offs

| Lost | Gained |
| :--- | :--- |
| Simplicity — one more service to configure | Step-level retry (crash at Auditor → only Auditor retries, Scout recon preserved) |
| Two new env vars (`INNGEST_SIGNING_KEY`, `INNGEST_EVENT_KEY`) | Inngest dashboard: see exactly which step failed and why |
| Route no longer streams — client must poll | Reliable nightly briefing cron without external scheduler |
| | Approval gate pause/resume is durable — server restart does not lose in-flight approvals |
| | Tavily timeout retries the failed query, not the whole mission |

## Priority

High — mission reliability is core to the Vanguard security use case.
A mid-mission crash with no recovery is a worse operator experience than a
slightly longer mission with guaranteed step-level completion.
Approval gate durability is especially critical: losing an in-flight approval
context forces the operator to re-authorize, breaking the governance chain.

## Env Vars Required

```
INNGEST_SIGNING_KEY=<from Inngest dashboard>
INNGEST_EVENT_KEY=<from Inngest dashboard>
```

Add both to `.env.local` and Vercel environment before enabling.
Run `npm run verify:env` — update the env validator to assert these are present in production.

---

## Auditor Confidence Calibration (LLM-as-Judge)

- **Status:** Planned — post-interview implementation
- **Gap:** The auditor self-reports confidence (low / medium / high) with no external validation. A miscalibrated confidence rating flows directly into the governance brief and trust score with no check.
- **Planned (UI):** New graph node using `gpt-4o` as a cross-provider judge evaluates the auditor's confidence label against the evidence. Calibration score surfaces in the Governance Ledger alongside the existing trust score. Requires new state field, new graph node, UI component, and ledger integration. See `TECHNICAL_ADVISORY.md §12` for full rationale.

---

## Sequencing Rationale

Vanguard intentionally prioritizes:

1. governed autonomous execution and operator authority,
2. security/safety controls at action boundaries,
3. evidence traceability and compliance-facing governance outputs.

Near-term hardening focuses on retrieval quality guarantees, SLO formalization, and operational telemetry.
Broader enterprise platform expansion remains deferred by design.

---

## Document Status

This roadmap reflects Vanguard’s current intentional scope and maturity sequencing.

It is maintained as an engineering decision record that separates:

- implemented strengths,
- high-value near-term hardening,
- intentionally deferred enterprise layers.
