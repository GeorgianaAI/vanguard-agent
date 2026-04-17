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

### 5) Security and Safety

- **Status:** Implemented (Strong)
- **Evidence:** HITL authorization gate, policy checks, replay/staleness protections, rate limits, RBAC posture, red-team/adversarial testing.

### 6) Evaluation and Observability

- **Status:** Implemented (Strong foundation), Planned (SLO-linked telemetry)
- **Evidence today:** LangSmith traces, Sentry error monitoring (client/server/Edge), governance ledger/evidence trail, export-ready audit artifacts, test and CI validation.

### 7) Product Thinking

- **Status:** Implemented (Strong for current scope), Deferred (commercial/platform expansion)
- **Evidence today:** clear mission workflow, command center + governance UX, operator-centric control and evidence framing.

---

## Near-Term Hardening

> These are high-value improvements aligned with Vanguard’s current scope and should be prioritized before broader enterprise expansion.

### A) Retrieval Quality Hardening (Skill 3)

1. **Evidence provenance normalization**
   - Standardize retrieval artifact fields (`source`, `retrievedAt`, `confidence`, `provenanceId`).
2. **Citation-gated synthesis**
   - Require trace-linked evidence for high-confidence claims in final briefs.
3. **Retrieval evaluation harness (small but durable)**
   - Add a fixed mission set and track relevance/groundedness/citation coverage over time.
4. **Freshness + source trust policy**
   - Add lightweight freshness scoring and source trust tiers for retrieved evidence.

### B) Reliability Ops Formalization (Skill 4)

1. **Define explicit SLO starter set**
   - API success rate, p95 latency, mission completion rate, approval-gate integrity.
2. **Error budget policy (minimal)**
   - Document thresholds and temporary change-freeze criteria after budget burn.
3. **Alert mapping from health semantics**
   - Tie `/api/health` dependency states to clear alert actions and escalation ownership.

### C) Observability Expansion (Skill 6)

1. **Operational dashboard baseline**
   - Track request volume, error rates, tool failure rates, fallback rates, approval latency.
2. **Correlation completeness**
   - Ensure request/mission IDs are consistently visible across logs/traces/governance artifacts.
3. **Post-incident telemetry review loop**
   - Add a lightweight monthly reliability telemetry review ritual.
4. **Sentry source maps** *(optional near-term)*
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
