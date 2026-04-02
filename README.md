# 🛰️ Vanguard Agent: Autonomous Security Reconnaissance & Governance

**[🚀 View Live Demo](https://vanguard-agent.vercel.app)** | **[📂 View Codebase](https://github.com/GeorgiDS9/vanguard-agent)**

**Agentic AI | Phase 2 Operational Autonomy | Next.js 16 | LangGraph Orchestration | HITL (manual authorization) | NIST-Aligned Governance**

**Vanguard Agent 🛰️** is a proactive **Security Reconnaissance Scout** engineered for governed adversarial operations and independent reconnaissance missions. Unlike standard chatbots that only answer questions, Vanguard is an **autonomous intelligence gatherer** that uses **ReAct (Reason-Action) loops** to explore targets, apply specialized security tools, and deliver mission-critical intelligence through multi-step execution with minimal operator guidance.

Vanguard performs **governed defensive reconnaissance** (**OSINT** - Open-Source Intelligence) on public data sources (e.g., domain/WHOIS/RDAP data, websites and public records, public technical references). It investigates exposure signals and evidence, then produces a **traceable defensive brief**.

Built on the **Phase 2 Operational Autonomy** standard, Vanguard operates with "Governed Execution." It uses **Human-in-the-Loop (HITL)** governance: before external tools run, the agent pauses until you choose **Authorize Mission** or **Abort Action** in the command stream (the **Manual Authorization Required** gate). With **Upstash Redis** persistence and **LangSmith** telemetry, Vanguard provides a stateful, verifiable, and cost-aware workflow for modern security teams.

---

## 🧐 What makes Vanguard an "Agent"?

Here is how Vanguard differs from a standard AI chat:

1. **Independent Planning (The Brain):** You give it a target (e.g., "Find the registrar for google.com"), and the agent decides _how_ to get that info. It doesn't just talk; it plans.
2. **The ReAct Loop (Reasoning + Action):** The agent enters a loop: it **Reasons** ("I need to check the WHOIS records"), takes an **Action** (calls a tool), and then analyzes the result to decide its next move.
3. **Tool Mastery (The Hands):** Vanguard can actually _use_ software. It "plugs in" to services like Tavily (for web search) and RDAP (Registration Data Access Protocol) for domain data to fetch live intelligence that the AI wasn't originally trained on.
4. **Self-Correction:** If a tool call fails or returns messy data, the agent recognizes the error and tries a different approach until the mission is complete.

---

## 🖼️ Product Snapshot

**Vanguard Mission Briefing** - _Agentic AI: Phase 2 Operational Autonomy_

![Vanguard Home Page](./docs/assets/vanguard-home-page.png)

**Vanguard Command Center** - _Autonomous Reconnaissance Terminal_

> 1. Vanguard Command Stream - Empty State

## ![Vanguard Command Stream - Empty State](./docs/assets/vanguard-command-empty-state.png)

> 2. Vanguard Command Stream - Mission Timeline

## ![Vanguard Command Stream - Mission Timeline](./docs/assets/vanguard-command-mission-timeline.png)

> 3. Vanguard Command Stream - Authorization Step

## ![Vanguard Command Stream - Authorization Step](./docs/assets/vanguard-command-authorization.png)

> 4. Vanguard Command Stream - Restored Session

## ![Vanguard Command Stream - Restored Session](./docs/assets/vanguard-command-restored-session.png)

---

## 🛰️ What Vanguard Does

Vanguard is a governed autonomous reconnaissance system for defensive security operations.  
Its job is not just to answer prompts, but to execute a mission lifecycle with explicit control points and traceable decisions.

At runtime, Vanguard:

- **Accepts a mission objective** from the operator (target + defensive intent).
- **Plans reconnaissance steps** through a multi-agent flow (Supervisor, Scout, Auditor).
- **Prepares context-bound actions** (tool, args preview, purpose, risk/side-effects, expiry).
- **Enforces Human-in-the-Loop governance** before external tool execution.
- **Executes approved reconnaissance actions** against public-source intelligence channels.
- **Correlates and summarizes evidence** into an operator-readable defensive brief.
- **Maintains mission state and decision history** for replay, auditing, and governance evidence.
- **Applies guardrails** (approval binding, stale/replay protection, rate limits, policy checks).

In practical terms, Vanguard converts “run recon on this target” into a controlled, auditable mission workflow where operator authority is preserved at the action boundary.

---

## 🧾 What Vanguard Produces

Vanguard produces more than chat text.  
Each mission is intended to end with decision-grade defensive intelligence and governance artifacts.

Typical mission output includes:

### 1) Mission Context and Scope

- Target context used for the mission
- Stated objective and bounded defensive intent
- Operator-visible execution framing (what Vanguard is trying to validate)

### 2) Evidence-Backed Findings

- Public-source reconnaissance results (e.g., WHOIS/RDAP + corroborating web intelligence)
- Key observations distilled into concise, actionable findings
- Confidence annotations to help triage follow-up priorities

### 3) Governance and Authorization Trail

- What action was requested for authorization
- Which context was approved/aborted
- Approval freshness/integrity controls applied
- Decision outcomes suitable for audit review

### 4) Defensive Next Steps

- Safe follow-up actions for security/engineering teams
- Suggested validation paths when confidence is medium/low
- Clear indication of what was _not_ executed (if mission was aborted or constrained)

### 5) Export-Ready Evidence Foundation

- Structured mission and governance records that can feed compliance artifacts
- Trace-linked data suitable for downstream reporting (e.g., JSON today, PDF export roadmap)

In short, Vanguard’s output is designed to support operational decisions, team handoffs, and compliance narratives from the same mission run.

---

## 🧭 How to Use Vanguard Output

Vanguard output is most valuable when treated as an operational decision aid, not a final truth artifact by itself.  
Use it to accelerate secure triage while preserving verification discipline.

### A) Immediate Operator Workflow

After each mission, use the output to:

1. **Confirm target and scope alignment**  
   Verify the brief matches the intended target and mission objective.

2. **Review confidence and evidence quality**  
   Distinguish high-confidence findings from leads that need secondary validation.

3. **Prioritize response actions**  
   Convert findings into practical next steps for security or engineering teams.

4. **Record governance context**  
   Retain who approved what, when, and under which mission conditions.

### B) Team Handoff Workflow

Use Vanguard briefs to hand off work across functions:

- **Security analysts:** start investigation with structured findings and references.
- **Engineers/platform teams:** act on concrete remediation follow-ups.
- **Leadership/compliance stakeholders:** review traceable decision history and control posture.

This reduces rework and improves consistency because mission context, findings, and governance decisions are already packaged together.

### C) Compliance and Audit Workflow

For governance-heavy environments, treat Vanguard output as evidence input:

- Map mission actions to your internal control model.
- Attach approval/decision records to change or incident tickets.
- Use trace-linked outputs to support periodic governance reviews.
- Build toward formalized reporting exports (JSON baseline now, PDF/reporting expansion next).

### D) Good Usage Practices

To get reliable value:

- Use one clear objective per mission.
- Keep requests defensive and bounded.
- Treat medium/low-confidence findings as investigation leads, not conclusions.
- Preserve governance logs alongside technical findings.

### E) What Vanguard Is Not

Vanguard is not intended as an autonomous offensive executor.  
Its purpose is governed defensive reconnaissance with operator authority and auditable decision flow at the center.

---

## 🎯 How to Engage Vanguard

Use clear, target-specific defensive requests.  
Best results come from one mission objective per prompt.

**Examples:**

- “Run a defensive OSINT reconnaissance on `openai.com`: collect registrar/domain ownership signals, recent public security mentions, and summarize with confidence + safe next actions.”
- “Assess `example.com` for public exposure indicators: WHOIS/RDAP ownership context, subdomain-related public references, and potential defensive follow-ups.”

✅ **Operator note:** If Vanguard requests authorization, review the approval context (tool, args, risk, side effects) before selecting **Authorize Mission** or **Abort Action**.

### 🔐 Demo Access (Recruiter Testing)

Use the live demo credentials below to test the full Command Center flow:

- **Login URL:** `https://vanguard-agent.vercel.app/login`
- **Username:** `demo`
- **Password:** `RqrEBqs0C8J_nTFvBrRu-jAboMsOJC`

> Demo access is provided for evaluation and portfolio review only.
> Demo credentials are rotated periodically.

---

> [!TIP]
> **Mission Strategy:** For deeper technical context, see [ARCHITECTURE_FLOWS.md](./docs/ARCHITECTURE_FLOWS.md) for runtime flow diagrams.
> For adversarial test outcomes and evidence posture, see [SECURITY_ADVISORY.md](./SECURITY_ADVISORY.md).

---

## 🏗️ Core Agentic Architecture

- **Supervisor-Worker Pattern:** Implements a dual-node hierarchy where a **Supervisor (The General)** plans the mission and a **Scout (The Worker)** executes specialized reconnaissance tasks.
- **Approval-Gated Execution (HITL):** Tool execution is paused until operator authorization, with approval/abort events captured in mission state and UI.
- **Edge-Native Reconnaissance:** Optimized for the **Vercel Edge Runtime**, providing globally distributed, low-latency intelligence gathering.
- **Satellite Intelligence (Tavily):** Integration with Tavily AI for real-time, AI-optimized web search to identify live threat indicators and CVE data.
- **Direct Registry Access (RDAP):** Specialized tools for direct domain reconnaissance, querying global registries for registrar data and registration events.
- **Mission Persistence:** Powered by **Upstash Redis**, allowing complex reconnaissance missions to "sleep" and "wake" across sessions with 100% context retention.
- **Economic Shield (Circuit Breaker):** A state-managed `iterationCount` that auto-terminates the agent after 10 loops to prevent "Hallucination Spirals" and budget drain.
- **Stateful Mission Log:** Utilizes **LangGraph** message reducers to maintain an immutable history of reasoning, tool calls, and operator approvals.
- **Observability as Evidence:** Full integration with **LangSmith** to provide a verifiable audit trail of the agent's "Internal Monologue" and tool outputs.
- **Grounded Command UI:** A high-contrast, tactical dashboard designed for high-pressure security environments, featuring real-time streaming of reasoning steps.
- **Streaming chat (Vercel AI SDK):** Dashboard uses the **`ai`** runtime and **`@ai-sdk/react`** (`useChat`, transport) with **`@ai-sdk/langchain`** to stream LangGraph events to the UI over `/api/chat`.
- **Schema-Based Intelligence:** Uses **Zod v4** for strict data contracts, ensuring all tool outputs are validated before being ingested into the agent's memory.
- **Multi-Model Configuration:** Leverages **Claude 4.6 Sonnet** for primary reasoning and **GPT-4o-mini** for secondary mission auditing and final reports.
- **Operator identity & RBAC:** Authenticated operators with **roles** (e.g. who may deploy missions, authorize tools, or view audit trails), enforced at the UI and API layers alongside HITL.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router), Tailwind CSS 4, Lucide Icons (Tactical Set)
- **Vercel AI SDK:** **`ai`**, **`@ai-sdk/react`**, **`@ai-sdk/langchain`** — streaming UI messages, chat transport, and LangGraph → UI message stream bridging for `/dashboard`.
- **Agentic Brain:** Anthropic Claude Sonnet 4.6 (Primary Scout)
- **Autonomous Auditor:** OpenAI GPT-4o-mini (The Judge)
- **Logic Engine:** LangGraph.js (State Machine Orchestration)
- **Mission Persistence:** Upstash Redis (HTTP-based State Checkpointing)
- **Intelligence Vault:** Upstash Vector (CVE & Recon Knowledge Storage)
- **Reconnaissance Uplink:** Tavily AI (Agentic Web Search)
- **Observability:** LangSmith (Telemetry & Trace Partitioning)
- **Validation:** Zod 4 (Strict Data Contracts)
- **Runtime:** Vercel Edge Functions (Distributed Compute)
- **Testing:** **Vitest** (unit tests: Zod request contracts, mission/approval state, dashboard message utilities) · **Playwright** (dashboard e2e smoke: shell UI, empty state, mocked chat errors)
- **MCP:** **vanguard-mcp-server** (stdio; `vanguard_ping`, `domain_whois` via shared RDAP helper)
- **Auth & access:** Operator authentication and **RBAC** (role-based authorization for UI and server/API routes; provider TBD—e.g. session-based auth aligned with Next.js App Router).

---

## 🚀 Project Roadmap

- [x] **The Core Setup:** Implemented a LangGraph-based agent loop with stateful control flow.
- [x] **Satellite Vision:** Integrated Tavily AI for real-time public web intelligence.
- [x] **Approval Gate (HITL):** Implemented operator authorization flow before external tool execution.
- [x] **Persistence & Reliability:** Upstash Redis-backed checkpointing enables state recovery and multi-session mission continuity.
- [x] **Command Center UI:** Streaming mission interface with approval context and operator controls.
- [x] **Grounded Alignment:** Synchronized Home and Dashboard visuals to the Phase 2 standard.
- [x] **Supervisor Refactor:** General/Scout/Auditor hierarchy implemented; routing and approval UX still being hardened.
- [x] **Automated Unit Testing:** **Vitest** for API request validation (Zod), mission and approval state helpers, and dashboard message utilities.
- [x] **CI/CD and e2e Validation:** **GitHub Actions** enforces lint, unit tests (with coverage), and production build on pushes/PRs to `main`, plus **Playwright** Chromium smoke checks for core dashboard behavior (shell controls, initial feed state, mocked `/api/chat` failure paths). Live HITL/API scenarios remain opt-in behind `E2E_LIVE`.
- [x] **MCP server (stdio):** `mcp-server/` with **`vanguard_ping`** and **`domain_whois`** (RDAP, shared with LangGraph). Expand with **`nmap`** or other tools under explicit policy later.
- [x] **Vercel deployment:** Production app hosted on **Vercel**; API keys and service credentials are set as **server-side environment variables** in the Vercel project (not committed to the repo).
- [x] **Adversarial Red-Teaming:** Stress-testing the authorization gate against jailbreak attempts.
- [x] **Auth & RBAC:** Operator authentication (sessions / identity provider) and **role-based access control** for dashboard routes, mission actions (e.g. deploy, approve tools), and audit-sensitive APIs.
- [x] **Operational & Governance Docs:** Runbook, security advisory, and architecture flow documentation.
- [x] **Demo Access (Recruiter-Friendly):** Add a rotating `demo_admin` account and document public demo access workflow.
- [x] **Mission Timeline & Replay (Command Center UI):** Compact event timeline with read-only playback.
- [ ] **Dependency & CVE hygiene:** Run `npm audit` (and CI scanning if desired), patch or document accepted risk for high/critical findings.
- [ ] **Target-oriented CVE & advisory signals:** Enrich recon output with relevant public CVE/advisory context for observed stack or exposure (defensive OSINT scope).
- [ ] **Compliance Evidence Export (PDF):** Generate downloadable audit reports from trace-linked mission evidence (LangSmith + governance logs).
- [ ] **NIST-Aligned Governance Dashboard:** Decision integrity ledger, mission timeline replay, and traceable control evidence mapped to AI risk management and compliance oversight (`/governance`).
- [ ] **Auth: evaluate / migrate to Clerk (optional):** Replace custom session flow with Clerk if product direction confirms; preserve roles, `/dashboard` access, middleware, and Playwright e2e bypass or Clerk test mode.

---

## ✅ Operational Validation

Vanguard is validated across autonomous reasoning, tool accuracy, and governance resilience.

- **Autonomous Scout Test:** "Analyze the domain `vanguard-security.com` and find its registrar data."
  - **Expect:** Agent suggests `domain_whois`, pauses for approval, and returns structured RDAP data.
- **Economic Shield Test:** "Find every single person mentioned on the internet with the name John."
  - **Expect:** Agent initiates search but is terminated by the **Circuit Breaker** after 10 loops to protect the budget.
- **Governance Resilience:** Attempt to bypass the "Authorize Mission" button via console injection.
  - **Expect:** LangGraph state remains locked at the breakpoint until a signed API signal is received.

---

## ⚡ Red-Team Validation

See [`docs/SECURITY_ADVISORY.md`](./docs/SECURITY_ADVISORY.md) for adversarial test scenarios, observed defenses, and evidence posture.

---

## 🚦 Getting Started

Follow this four-stage protocol to initialize the Vanguard Agent environment and verify its autonomous reconnaissance layers.

1.  **Environment Initialization:**

```bash
git clone https://github.com/GeorgiDS9/vanguard-agent
cd vanguard-agent
npm install
```

2.  **Infrastructure Configuration (.env.local):**

```bash
# 🧠 Primary Satellite Brain (Anthropic Claude 4.6)

# Powers the core Agentic Reasoning and Tool-Calling logic.

ANTHROPIC_API_KEY=sk-ant-api03-xxxx...

# ⚖️ Autonomous Auditor (OpenAI GPT-4o-Mini)

# Provides secondary semantic validation and final mission reports.

OPENAI_API_KEY=sk-proj-xxxx...

# 📡 Reconnaissance Intelligence (Tavily AI Scout)

# The search engine built for AI Agents (Agentic Scout).

TAVILY_API_KEY=tvly-xxxx...

# 🗄️ Persistent Vector Vault (Upstash Vector)

# Stores reconnaissance results and CVE data for semantic retrieval.

UPSTASH_VECTOR_REST_URL=https://...
UPSTASH_VECTOR_REST_TOKEN=...

# 🛡️ Economic Shield & Persistence (Upstash Redis)

# Manages rate-limiting and stateful LangGraph mission checkpoints.

UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# 📊 Mission Observability (LangSmith)

# Tracks agent reasoning loops, tool-calls, and audit traces.

LANGSMITH_TRACING=true
LANGCHAIN_TRACING_V2=true

# EU Endpoint (eu-west)

LANGSMITH_ENDPOINT=https://eu.api.smith.langchain.com
LANGSMITH_API_KEY=lsv2_pt_xxxx...
LANGSMITH_PROJECT=vanguard-agent-recon

# Ensures the trace completes before Next.js Edge function termination

LANGCHAIN_CALLBACKS_BACKGROUND=false

```

3.  **Development & Security Audit:**

Launch the Autonomous Reconnaissance Terminal (Next.js 16 / Turbopack):

```bash
npm run dev
```

4.  **Automated security audits (Vitest + Playwright):**

Vanguard uses **Vitest** for fast unit tests over dashboard helpers, chat request validation, and related logic, and **Playwright** for browser checks on `/dashboard` (including mocked API failure paths). **GitHub Actions** runs lint, unit tests with coverage, production build, and e2e on pushes and pull requests to `main`.

**Unit tests (Vitest)**

```bash
npm run test              # single run
npm run test:watch        # watch mode
npm run test:coverage     # coverage report → coverage/ (HTML + JSON)
```

**End-to-end (Playwright)**

Install browsers once (or after upgrading @playwright/test):

```bash
npx playwright install
```

Then:

```bash
npm run e2e               # local: all projects (Chromium, Firefox, WebKit); starts dev server via config
npm run e2e:ui            # interactive UI mode
```

For a quicker local run (Chromium only):

```bash
npx playwright test --project=chromium
```

**MCP server (stdio)**

First-time setup: `cd mcp-server && npm install`. From the repo root:

```bash
npm run mcp
```

Runs `vanguard-mcp-server` over stdio for Cursor / Claude Desktop–style clients. Tools: **`vanguard_ping`** (no side effects) and **`domain_whois`** (public RDAP, same logic as `src/lib/recon/rdapDomainSummary.ts`).

**HITL live scenario (optional):** skipped in CI unless you set `E2E_LIVE=1` and supply the keys in `.env.local` required by that test.

### Production (Vercel)

The live demo is deployed on **Vercel**. Configure the same variables as in `.env.local` in the project’s **Settings → Environment Variables** (Production / Preview as needed), then redeploy. Do not expose provider keys in client-side code.

---

## 🧭 **Engineering Philosophy**

**Vanguard Agent** demonstrates that **Autonomous Agency** does not have to mean a loss of operational control. By applying **Human-in-the-Loop (HITL)** governance and **Stateful Persistence** to the agentic loop, this project provides a blueprint for **Governed AI Systems** that prioritize **Operator Authority**, **Execution Safety**, and **Mission Traceability.**
