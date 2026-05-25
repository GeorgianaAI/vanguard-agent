# 📄 Vanguard Agent: Compliance & Governance

**Vanguard is architected around Human-in-the-Loop (HITL) authorization, cryptographic approval binding, and traceable governance evidence — with operator authority and mission auditability as first-class engineering concerns.**

## Contents

1. [Compliance Philosophy](#compliance-philosophy)
2. [NIST AI RMF Alignment](#nist-ai-rmf-alignment)
3. [Regulatory Landscape](#regulatory-landscape)
4. [Model Governance & Model Cards](#model-governance--model-cards)
5. [Data Governance](#data-governance)
6. [Audit Trail Specifications](#audit-trail-specifications)
7. [Risk Assessment Framework](#risk-assessment-framework)
8. [OWASP LLM Top 10](#owasp-llm-top-10)

---

## Compliance Philosophy

Vanguard is a governed autonomous reconnaissance platform for defensive security operations. Unlike general-purpose AI assistants, it is designed with the explicit assumption that any external action taken by an AI agent against a target — however defensive in intent — requires an auditable human authorization record.

Protection is not applied after the fact: the **approval gate is on the critical path**. No tool executes without an operator-signed authorization token bound to the exact context pending approval. No approval can be replayed. No tampered context can succeed.

This positions Vanguard at the **GOVERN + MANAGE layer** of the NIST AI Risk Management Framework: it enforces authorization controls, surfaces governance evidence through the Governance Ledger (`/governance`), and produces a traceable audit trail covering every mission decision, tool execution, and operator authorization event.

Compliance obligations fall into two categories:

- **Direct:** Vanguard's own data handling, approval binding, session isolation, and model usage controls
- **Operational:** Vanguard enables its operators' compliance posture — providing HITL records, LangSmith-linked traces, approval context archives, and governance evidence that support downstream audit and regulatory requirements

---

## NIST AI RMF Alignment

Vanguard implements the four NIST AI RMF functions as architectural primitives. The Governance Ledger (`/governance`) surfaces live evidence for each function.

### GOVERN — Policies and Accountability

- **Model selection documented** — `claude-sonnet-4-6` (Anthropic) for all three agents: Supervisor routing, Scout reconnaissance, and Auditor synthesis; rationale in `CLAUDE.md §2`
- **Roles defined** — RBAC with three roles: `viewer`, `analyst`, `admin`. Role hierarchy is modelled and the role claim is verified in the session JWT. Per-route enforcement (`analyst` minimum for missions/approvals, `admin` for evidence export) is a planned hardening item — see `HARDENING_ROADMAP.md §E`
- **Change governance** — version-locked stack (Next.js 16.2.3 exact pin; model IDs not swapped without Architect decision); no tool is added to the approval allowlist without a corresponding policy entry in `src/lib/approval/policy.ts`
- **HITL as governed invariant** — the authorization gate is on the critical execution path; it cannot be made conditional, bypassed via prompt pressure, or removed without architectural review
- **Approval policy** — the approval allowlist (`APPROVAL_TOOL_ALLOWLIST`) is the authoritative list of tools that may be submitted for operator authorization; any tool not on this list cannot proceed through the approval path

NIST Controls: `GOVERN 1.1` (accountability structures), `GOVERN 1.2` (roles and responsibilities), `GOVERN 4.1` (organizational risk policies)

### MAP — Context and Risk Documentation

- **Purpose documented** — Vanguard performs governed defensive reconnaissance (OSINT) on public-source data (WHOIS/RDAP, web search via Tavily). It does not perform offensive operations, does not cross network boundaries without operator authorization, and does not access private or confidential systems
- **Known limitations documented** — single embedding model (Upstash Vector), circuit breaker caps at 3 iterations (does not guarantee complete coverage of complex targets), LangSmith trace completeness depends on `LANGCHAIN_CALLBACKS_BACKGROUND=false` being set
- **Risk boundaries** — Vanguard's risk is bounded to public-source data; it cannot read across mission namespaces, escalate privileges beyond the HITL gate, or invoke tools not on the allowlist
- **Threat surface mapped** — approval bypass, replay attacks, hash collision attempts, prompt-pressure social engineering, and rate-limit abuse are documented in `docs/SECURITY_ADVISORY.md`

NIST Controls: `MAP 1.1` (context and purpose), `MAP 2.1` (domain expertise), `MAP 3.5` (risk identification)

### MEASURE — Evaluation and Metrics

- **Governance Trust Score** — a NIST-aligned composite score (0–100%) derived from approval resolution, evidence completeness, advisory posture, and HITL integrity; surfaces in the Governance Ledger header as a real-time compliance signal
- **Red team CI suite** — adversarial Playwright suite (`tests/redteam.spec.ts`) + unit harness (`app/api/chat/route.post.test.ts`) validates approval bypass resistance, replay prevention, hash tamper detection, and rate-limit enforcement
- **Approval gate coverage** — unit tests verify all governance status codes (400 malformed, 409 stale/tampered/replay, 429 rate-limited, 503 critical dep unavailable)
- **Evidence package schema** — `src/lib/audit/evidence.ts` produces a versioned `EvidencePackage` per mission with trace correlation, status, and stage metadata; tested in `src/lib/audit/evidence.test.ts`

NIST Controls: `MEASURE 1.1` (evaluation approaches established), `MEASURE 2.1` (grounding and accuracy), `MEASURE 2.5` (hallucination risks tracked), `MEASURE 2.6` (bias and safety)

### MANAGE — Risk Treatment and Response

- **Circuit breaker** — `iterationCount` state cap (3 loops) terminates runaway agent cycles deterministically; prevents hallucination spirals and unbounded API cost
- **Rate limiting** — Upstash Redis sliding-window counters enforce per-IP mission rate limits (5/rolling minute, 5/rolling 24 h) and per-IP approval rate limits (3/rolling minute); all counters checked before any AI pipeline runs
- **HITL-first enforcement** — no external tool call executes without a valid, fresh, hash-bound operator authorization
- **Replay prevention** — Redis `SET NX` one-time lock on `approval_id` prevents the same approval from being processed twice, even under concurrent request conditions
- **Abort path** — operator can select Abort Action at any HITL gate; `missionAborted: true` is written to state and captured in the governance ledger, providing a complete non-execution record
- **Fail-closed in production** — missing critical dependencies (`redis`, `vector`) return deterministic `503` in production rather than silently degrading

NIST Controls: `MANAGE 1.1` (risk treatment decisions), `MANAGE 2.2` (residual risks and uncertainties), `MANAGE 3.1` (risk response)

---

## Regulatory Landscape

Vanguard operates in security and compliance-adjacent workflows. Regulatory exposure depends on deployment context.

### GDPR (General Data Protection Regulation)

**Scope:** Conditional. Vanguard targets are supplied by operators and are typically public domain names, IP ranges, or organization identifiers. If an operator supplies personal data as a mission target (e.g., an individual's name), GDPR obligations apply to the operator's deployment.

**Controls in place:**

- **No PII ingestion pipeline** — Vanguard does not ingest, store, or process uploaded documents containing personal data. Mission targets are operator-supplied identifiers, not document content
- **Thread-scoped persistence** — mission state is checkpointed in Upstash Redis keyed to `thread_id`; no cross-thread data access is architecturally possible
- **LangSmith traces** — traces capture model inputs and outputs; operators should ensure no personal data is embedded in mission targets or prompts submitted to the system

**Residual risk:** If an operator intentionally or accidentally submits personal data as a reconnaissance target (e.g., an individual's email address), that data will appear in Redis checkpoints and LangSmith traces. Vanguard does not perform DLP on mission inputs — this is an operator responsibility at the deployment boundary.

### EU AI Act

**Scope:** Vanguard is a **general-purpose AI system** used for security reconnaissance. Depending on deployment context (security operations teams, red team engagements, compliance workflows), it may fall within scope of the EU AI Act's requirements for general-purpose AI models with systemic risk, or as a component in a high-risk AI system under Annex III.

**Controls in place:**

- Governance Ledger provides per-mission compliance evidence aligned with Article 9 (risk management) and Article 17 (quality management)
- HITL authorization gate supports Article 14 (human oversight) obligations — no external action proceeds without operator authorization
- LangSmith traces and approval context archives support Article 12 (record-keeping and logging) requirements
- NIST AI RMF alignment maps directly to the EU AI Act's risk-based approach

**Operator responsibility:** High-risk classification and conformity assessment obligations depend on the deployment context chosen by the operator.

### CCPA/CPRA

**Scope:** Applies if California consumer personal information is present in operator-supplied mission inputs. Vanguard's default operation against public domain targets does not implicate CCPA; operator-specific deployment decisions govern this.

### Security Operations Regulatory Contexts

Vanguard is designed for governed defensive security operations. Operators deploying Vanguard in regulated environments (e.g., financial services, healthcare, critical infrastructure) are responsible for:

- Ensuring that OSINT reconnaissance against targets complies with applicable computer fraud and abuse laws in their jurisdiction
- Establishing a written authorization record (beyond the Vanguard HITL gate) for any reconnaissance against third-party infrastructure
- Retaining governance export artifacts (JSON evidence + PDF) as supplementary compliance evidence

---

## Model Governance & Model Cards

### claude-sonnet-4-6 — Primary Scout & Supervisor

| Property         | Value                                                                                                 |
| :--------------- | :---------------------------------------------------------------------------------------------------- |
| **Role**         | Supervisor planning and Scout reconnaissance reasoning; tool selection and multi-step ReAct execution |
| **Provider**     | Anthropic                                                                                             |
| **Input**        | Operator mission objective + target + system prompt + prior message history                           |
| **Output**       | Streamed reasoning steps, tool call proposals, AUTHORIZATION_REQUIRED signals                         |
| **Tracing**      | LangSmith — all calls logged to the `vanguard-agent-recon` project (EU endpoint by default)           |
| **HITL gate**    | All tool calls proposed by this model require explicit operator authorization before execution        |
| **Bias risk**    | May over-weight publicly visible evidence; confidence annotations help triage                         |
| **Failure mode** | Circuit breaker terminates at 10 iterations; no open-ended tool execution loop possible               |

**Governance decisions:**

- `claude-sonnet-4-6` is the primary model — balances reasoning depth with cost efficiency for multi-step OSINT missions
- Model ID is pinned in `CLAUDE.md §2`; changing it requires Architect decision and full regression of HITL gate behavior
- The system prompt is an architectural invariant — changes require Architect review and adversarial re-validation via the red team CI suite

### claude-sonnet-4-6 — Auditor (Mission Synthesis)

| Property         | Value                                                                                          |
| :--------------- | :--------------------------------------------------------------------------------------------- |
| **Role**         | Auditor node — synthesizes Scout findings into structured final brief and governance summary   |
| **Provider**     | Anthropic                                                                                      |
| **Input**        | Scout recon results, tool output, mission objective                                            |
| **Output**       | Structured mission brief with evidence citations, confidence annotations, defensive next steps |
| **Tracing**      | LangSmith — Auditor calls logged with mission context                                          |
| **Bias risk**    | May compress or omit low-confidence findings in synthesis; raw Scout output preserved in state |
| **Failure mode** | Auditor failure produces a partial brief; mission state is checkpointed and recoverable        |

**Governance decisions:**

- The same model (`claude-sonnet-4-6`) is used across all three agents — Supervisor, Scout, and Auditor — for consistency and to avoid inter-model output format drift
- Auditor output is not in the approval critical path — it cannot authorize or execute tools; its role is summarization only

### Tavily Search API — Retrieval Layer

| Property         | Value                                                                                    |
| :--------------- | :--------------------------------------------------------------------------------------- |
| **Role**         | AI-optimized web search for live OSINT retrieval; used by Scout via `tavily_search` tool |
| **Provider**     | Tavily AI                                                                                |
| **Input**        | Operator-approved search query (args validated via Zod before submission)                |
| **Output**       | Structured search results with source URLs and content snippets                          |
| **Gate**         | Every `tavily_search` call requires explicit operator authorization via HITL gate        |
| **Failure mode** | Tavily timeout fails the Scout step; mission is checkpointed and retryable               |

---

## Data Governance

### Data Classification

| Asset                                      | Classification            | Location                                           | Retention                                              |
| :----------------------------------------- | :------------------------ | :------------------------------------------------- | :----------------------------------------------------- |
| **Mission state / checkpoint**             | Internal — thread-scoped  | Upstash Redis (`thread_id`-keyed)                  | Upstash TTL (operator-configurable)                    |
| **Approval context (`ApprovalContextV1`)** | Internal — thread-scoped  | Upstash Redis (embedded in checkpoint)             | Same as mission state                                  |
| **Approval NX lock**                       | Operational               | Upstash Redis (`approval_lock:{approval_id}`)      | Short TTL (replay prevention window)                   |
| **CVE / knowledge store**                  | Internal — shared         | Upstash Vector                                     | Until explicit purge; Upstash retention                |
| **Rate-limit counters**                    | Operational               | Upstash Redis                                      | Redis TTL (sliding window)                             |
| **LangSmith traces**                       | Internal — third-party    | LangSmith (EU cloud, `eu.api.smith.langchain.com`) | LangSmith retention policy                             |
| **Evidence package**                       | Internal — thread-scoped  | In-memory / governance API response                | Request lifetime; export triggers client-side download |
| **Session JWT**                            | Operational               | HTTP-only cookie (`__Host-vanguard-session`)       | JWT TTL (`AUTH_SESSION_TTL_SECONDS`)                   |
| **Sentry error telemetry**                 | Operational — third-party | Sentry (US cloud)                                  | Sentry retention policy                                |

### Subprocessors

| Subprocessor  | Role                                                               | Compliance                                      |
| :------------ | :----------------------------------------------------------------- | :---------------------------------------------- |
| **Anthropic** | claude-sonnet-4-6 — Supervisor, Scout, and Auditor (all agents)    | Usage policies; data processing terms available |
| **Upstash**   | Redis (checkpoints, rate limits, locks) + Vector (knowledge store) | SOC 2 Type II                                   |
| **Tavily AI** | Retrieval — AI-optimized web search for Scout tool calls           | Usage policies; enterprise terms available      |
| **LangSmith** | Observability — mission trace audit trail                          | Enterprise-grade data handling; EU endpoint     |
| **Vercel**    | Hosting + Edge Runtime                                             | SOC 2 Type II                                   |
| **Sentry**    | Error monitoring — client, server, Edge Runtime                    | SOC 2 Type II                                   |

### Access Controls

- **Thread namespace isolation** — `thread_id` is the only key that scopes Redis checkpoint reads and writes; no cross-thread state access is architecturally possible
- **RBAC model** — `viewer`, `analyst`, `admin` roles defined in `src/lib/auth/rbac.ts`; role claim is carried in the session JWT and verified on every request. Per-route minimum-role enforcement is a planned hardening item (see `HARDENING_ROADMAP.md §E`)
- **API keys server-only** — `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `TAVILY_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `UPSTASH_VECTOR_REST_TOKEN`, `LANGSMITH_API_KEY` are never exposed to the client; never prefixed `NEXT_PUBLIC_`
- **Session HTTP-only** — JWT session token is stored in an HTTP-only `__Host-` cookie; never accessible to client-side JavaScript
- **CSRF validation** — mutating requests validated via CSRF token (`src/lib/auth/csrf.ts`)

---

## Audit Trail Specifications

Every mission produces a traceable record across three surfaces: the Governance Ledger, the evidence package, and LangSmith.

### Approval Context Record (`ApprovalContextV1`)

Produced by the Scout node before every tool execution request. Hash-bound to the operator at authorization time.

```json
{
  "version": 1,
  "approval_id": "apr-abc123",
  "thread_id": "vanguard-1234567890",
  "requested_at": "2026-05-20T14:00:00.000Z",
  "expires_at": "2026-05-20T14:05:00.000Z",
  "requested_by_node": "scout",
  "summary": "Need registrar metadata before corroboration.",
  "risk_level": "low",
  "side_effects": "read_only_public_data",
  "policy_tags": ["public-data"],
  "tool": {
    "name": "domain_whois",
    "args": { "domain": "openai.com" },
    "args_display": { "domain": "openai.com" },
    "arg_hash": "sha256:aaaa..."
  },
  "expected_output": ["registrar"],
  "constraints": {
    "allowed_tools": ["domain_whois", "tavily_search"],
    "target_lock": "openai.com"
  },
  "prior_approvals_in_thread": 0,
  "changes_since_last": ["First authorization in this thread."]
}
```

### Evidence Package (`EvidencePackage`)

Produced by `src/lib/audit/evidence.ts` on mission completion. Maps LangSmith runs to governance trace records.

```json
{
  "version": 1,
  "evidence_status": "complete",
  "mission_id": "mission-abc123",
  "thread_id": "vanguard-1234567890",
  "generated_at": "2026-05-20T14:03:00.000Z",
  "trace_correlation": {
    "thread_id": "vanguard-1234567890",
    "langsmith_run_ids": ["ls:run:uuid-1", "ls:run:uuid-2"]
  },
  "traces": [
    {
      "id": "ls:run:uuid-1",
      "status": "ok",
      "metadata": {
        "stage": "recon",
        "request_id": "req-uuid",
        "start_time": "2026-05-20T14:00:01.000Z",
        "end_time": "2026-05-20T14:00:04.000Z"
      }
    }
  ]
}
```

### Audit Guarantees

- **HITL-first** — approval context is produced and hash-bound before any tool executes; the context record is the authoritative evidence of operator authorization
- **One-time lock** — Redis `SET NX` on `approval_id` ensures each approval is processed exactly once, even under concurrent request pressure; the lock record is the replay prevention evidence
- **Hash tamper detection** — `approval_context_hash` is computed over the full `ApprovalContextV1` structure; any field modification produces a hash mismatch and deterministic `409` rejection
- **Abort auditability** — an operator selecting Abort Action produces `missionAborted: true` in state and a corresponding ledger row; non-execution is as traceable as execution
- **Thread traceability** — all Redis operations and LangSmith traces are keyed to `thread_id`; the thread in the governance ledger is the authoritative scope of what data was accessed
- **Rate-limit transparency** — Upstash Redis counters log at the proxy layer; request rejection events are traceable via `x-request-id` response header

---

## Risk Assessment Framework

### Risk Register

| Risk                                           | Likelihood | Impact    | Control                                                                              | Residual                                                                                            |
| :--------------------------------------------- | :--------- | :-------- | :----------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| **Approval bypass via prompt pressure**        | Low        | High      | HITL gate enforced server-side; system prompt hardened; red team CI validates        | Accepted — adversarial tests verify resistance; prompt alone cannot bypass server-side state checks |
| **Approval replay attack**                     | Low        | High      | Redis `SET NX` one-time lock on `approval_id`; `expires_at` freshness window         | Accepted — lock semantics prevent replay; tests verify                                              |
| **Approval context tampering**                 | Low        | High      | SHA-256 hash over full `ApprovalContextV1`; mismatch → deterministic 409             | Accepted — hash binding verified in red team and unit test suite                                    |
| **Rate-limit bypass / budget drain**           | Medium     | Medium    | Dual-bucket Redis sliding-window (5/min, 5/day per IP); approval bucket 3/min        | Accepted — two-layer ceiling; hard cap before AI pipeline                                           |
| **Hallucination spiral / unbounded execution** | Low        | Medium    | Circuit breaker: `iterationCount` cap at 10 loops; auto-terminates deterministically | Accepted — deterministic termination; iteration count not manipulable via prompt                    |
| **Cross-thread state leakage**                 | Very Low   | Very High | `thread_id`-scoped Redis keys; no global or shared namespace for mission state       | Negligible — architecture prevents cross-thread access                                              |
| **API key exposure**                           | Very Low   | Very High | All keys server-only; never `NEXT_PUBLIC_`; HTTP-only session cookie                 | Negligible — architecture prevents client exposure                                                  |
| **Critical dependency outage (Redis)**         | Low        | High      | Deterministic 503 in production; degraded mode in non-prod; health endpoint          | Accepted — fail-closed production behavior documented in runbook                                    |
| **LangSmith trace data exposure**              | Low        | Low       | Traces capture mission targets and tool outputs (public OSINT data only by default)  | Accepted — operator responsible for not supplying personal data as targets                          |
| **Session JWT theft**                          | Very Low   | High      | HTTP-only `__Host-` cookie; CSRF validation on mutations; short TTL                  | Negligible — cookie not accessible to JS; CSRF token required for state changes                     |
| **MCP server lateral movement**                | Very Low   | Low       | MCP server is read-only (domain_whois, vanguard_ping only); no mission state access  | Negligible — MCP server cannot touch Redis, approval gate, or execution pipeline                    |

### Accepted Limitations

1. **No PII DLP on mission inputs** — Vanguard performs reconnaissance on operator-supplied targets. If an operator submits personal data as a target, no automatic redaction occurs. Operators are responsible for ensuring their mission inputs comply with applicable privacy law in their deployment context.

2. **LangSmith trace retention is third-party governed** — Trace retention periods and deletion are subject to LangSmith's policies. Operators requiring specific retention windows must configure LangSmith project settings independently.

3. **Single embedding model dimension lock** — Upstash Vector index is pinned to a fixed dimensionality. Switching embedding models requires re-indexing and is an Architect decision.

4. **No durable step-level retry** — Missions that crash mid-execution (e.g., Tavily timeout at the Scout step) can be retried from the checkpointed state, but individual failed tool calls within a step are not retried independently. Inngest integration (documented in `HARDENING_ROADMAP.md`) is the planned path to step-level durability.

5. **Circuit breaker is iteration-based, not time-based** — The 10-loop cap prevents unbounded execution but does not enforce a wall-clock time limit. A mission where each iteration takes a long time will not be terminated until iteration 10. Edge function timeouts provide the secondary time boundary.

---

## OWASP LLM Top 10

Honest assessment of Vanguard against the OWASP LLM Top 10. The threat model here is an agentic execution platform with a HITL gate, not a RAG or chat system.

| #         | Vulnerability                        | Vanguard coverage                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| :-------- | :----------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **LLM01** | **Prompt Injection**                 | **Strong.** The HITL gate is enforced server-side regardless of prompt content — tool execution never proceeds based on model output alone. System prompt is a governed invariant. Red team CI (prompt pressure tests) verify gate integrity under adversarial inputs. _Gap: sufficiently sophisticated injection into tool output could influence Auditor synthesis; not currently tested at that layer._                                                             |
| **LLM02** | **Insecure Output Handling**         | **Partial.** Model outputs are streamed as text + structured JSON (approval context, evidence package). No HTML rendering path in the tactical dashboard. Approval context schema is Zod-validated before any downstream action. _Gap: no formal schema validation on raw Auditor synthesis text before it reaches the governance ledger row builder._                                                                                                                 |
| **LLM03** | **Training Data Poisoning**          | **Not applicable.** Vanguard uses the Anthropic inference API only — no custom training, fine-tuning, or model weight control. Risk sits with Anthropic.                                                                                                                                                                                                                                                                                                               |
| **LLM04** | **Model Denial of Service**          | **Strong.** Dual-bucket Redis rate limiting (5/min, 5/day per IP for missions; 3/min per IP for approvals) runs before any AI pipeline. Circuit breaker terminates at 3 agent iterations. Edge function timeout provides a secondary wall-clock bound. _Gap: no per-mission token budget enforcement — a complex target with many tool calls increases token consumption per mission._                                                                                 |
| **LLM05** | **Supply Chain Vulnerabilities**     | **Partial.** `npm audit --audit-level=high` runs in CI on both root and `mcp-server/` packages; `package-lock.json` committed. _Gap: no SBOM; no cryptographic verification of model API responses; transitive dependency on Anthropic, Upstash, Tavily, and LangSmith infrastructure._                                                                                                                                                                                |
| **LLM06** | **Sensitive Information Disclosure** | **Partial.** Vanguard operates on public OSINT targets, so the primary risk is not PII disclosure but **operator credential exposure** and **approval context leakage**. All API keys are server-only. Session JWT is HTTP-only. Approval context is bound to `thread_id` and not cross-accessible. _Gap: if an operator supplies personal data as a mission target, it is not redacted and will appear in traces and checkpoint state._                               |
| **LLM07** | **Insecure Plugin Design**           | **Strong.** Tool execution is governed by an explicit allowlist (`APPROVAL_TOOL_ALLOWLIST` in `src/lib/approval/policy.ts`). Every tool call requires a valid HITL authorization before execution. Tool args are Zod-validated against per-tool schemas before submission. `arg_hash` binds the approved args to the approval context — any post-approval arg modification is detectable.                                                                              |
| **LLM08** | **Excessive Agency**                 | **Strong. This is the primary threat model.** The HITL authorization gate is the central control — no tool executes without explicit operator approval. The circuit breaker caps iteration. The abort path provides a clean non-execution governance record. The allowlist limits what tools can even be proposed. _Gap: if an operator approves a `tavily_search` query, the Scout executes it without further per-result filtering of what is retrieved and stored._ |
| **LLM09** | **Overreliance**                     | **Partial.** Mission output is framed as intelligence, not authoritative fact. Confidence annotations and "defensive next steps" structure encourage verification discipline. The Governance Ledger shows what was authorized, what ran, and what was aborted — this surfaces the scope of evidence directly. _Gap: no per-finding confidence intervals surfaced to end users; the governance trust score is a summary signal, not a per-claim quality metric._        |
| **LLM10** | **Model Theft**                      | **Not applicable.** Anthropic API is used; model weights are not hosted or exposed. Rate limiting incidentally limits automated probing behavior.                                                                                                                                                                                                                                                                                                                      |

**Summary:** LLM07, LLM08 (the two highest-priority risks for an agentic execution platform) are well-covered. LLM01 and LLM04 are strong. LLM03 and LLM10 do not apply to the current architecture. LLM02, LLM05, LLM06, and LLM09 have partial coverage with documented gaps.

---

**For adversarial test scenarios, approval bypass evidence, and red team methodology, see [SECURITY_ADVISORY.md](./SECURITY_ADVISORY.md).** _This document is maintained locally and intentionally not published._

**For engineering rationale behind non-obvious design choices, implementation tradeoffs, and root-cause analyses (hash binding design, 409 semantics, NX lock, circuit breaker, fail-open vs fail-closed decisions, and more), see [TECHNICAL_ADVISORY.md](./TECHNICAL_ADVISORY.md).**

**For the evaluation and controls framework — governance trust score derivation, red team harness, approval integrity controls, and test coverage evidence — see [EVALUATION_AND_CONTROLS.md](./EVALUATION_AND_CONTROLS.md).** _This document is maintained locally and intentionally not published._
