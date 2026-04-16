@AGENTS.md

# ⬡ VANGUARD AGENT | Architecture & Governance

## 1. Project Intent

Vanguard is an autonomous multi-agent recon and governance platform. It orchestrates a supervised AI pipeline (Supervisor → Scout → Auditor) against operator-supplied targets, enforces human-in-the-loop authorization before any network action, and produces a NIST-aligned governance ledger with exportable audit evidence. Every mission is stateful, replayable, and cryptographically bound to its approval context.

## 2. Technical Stack

- **Framework:** Next.js 16.2.3 (App Router + React 19)
- **UI:** Tailwind CSS v4 (Cyan/Slate Mission Control Theme, Geist fonts)
- **Agent Orchestration:** LangGraph (`@langchain/langgraph`) — Supervisor → Scout → Auditor state machine
- **LLM:** Anthropic Claude (`@langchain/anthropic`, `claude-sonnet-4-6`) via Anthropic API
- **Web Intelligence:** Tavily (`@tavily/core`) — web search tool for Scout
- **State Persistence:** Upstash Redis (`@upstash/redis`) — mission checkpoint store
- **Rate Limiting:** Upstash Ratelimit (`@upstash/ratelimit`) — per-IP & per-thread request throttling
- **Vector Store:** Upstash Vector (`@upstash/vector`) — governance evidence indexing
- **Auth:** `jose` (JWT, `__Host-vanguard-session` cookie) + CSRF protection
- **Validation:** Zod — all API inputs, tool args, and approval contexts
- **Streaming:** Vercel AI SDK (`ai`) — `createUIMessageStreamResponse()`
- **Document Export:** `pdf-lib` — governance PDF generation
- **MCP Server:** `@modelcontextprotocol/sdk` — standalone MCP server (`mcp-server/`)
- **Testing:** Vitest (unit/integration) + Playwright (E2E)

## 2.1 Version Governance & Stability Lock

**Strict Version Policy:** This project is locked to **Next.js 16.2.3** (exact pin) and **React 19**. Do not upgrade without an explicit decision from the Architect.

- **Reason:** The codebase is built and tested on these versions. An upgrade introduces churn with no concrete benefit — wait until a specific feature or fix warrants it.
- **Constraint:** All new code must use React 19 patterns. Do not use APIs or patterns that were removed or changed in this version without reading the relevant guide in `node_modules/next/dist/docs/` first. If an "upgrade available" notice appears, ignore it.

## 3. Development Workflow (The Sprint Protocol)

- **Feature Branches:** e.g. `feat/`, `fix/`, `refactor/`
- **Atomic Commits:** Group changed files meaningfully and create several commits per feature. Separate concerns:
  1. UI / Layout
  2. API / Routes
  3. Agent Logic / Services
  4. Tests / Integration
- **Commit Metadata:** Never include "Co-authored-by: Claude", "Co-Authored-By:", or any AI attribution tags in commit messages.
  - **How to apply:** Write all commit messages without any trailing attribution lines. This applies to every commit, on every branch, always.
- **No Merges:** Pushing to remote is encouraged, but merging is restricted to the Architect (User).
- **Branch Hygiene Gate:** Before creating any new branch, run `git branch` and check for unmerged feature branches (branches not present in `main`). If any exist, stop and alert the Architect. List the unmerged branches and wait for explicit confirmation before proceeding. This prevents divergence conflicts where main evolves while an older branch is still open.
- **Modular Architecture:**
  - **Extraction:** If a feature area grows large, extract into a co-located `lib/` subdirectory with descriptive filenames (e.g., `app/dashboard/lib/constants.ts`, `app/dashboard/lib/types.ts`, `app/dashboard/lib/timeline.ts`). For complex API routes, extract adjacent helper files co-located next to `route.ts` (e.g., `approvalGuards.ts`, `locks.ts`, `missionRequest.ts`, `streaming.ts`, `telemetry.ts`). Hooks go into a co-located `hooks/` directory.
  - **Separation of Concerns:** Keep agent/business logic (Services in `src/lib/`) out of the UI (Components in `app/`). Complex route handlers extract their sub-concerns into adjacent helper files rather than keeping everything in a single `route.ts`.

## 4. Code Layout & Architecture

Maintain thin entrypoints. Logic must be extracted once a file exceeds approximately 150–200 lines.

### Directory Mapping

| Area                          | Purpose                                                                                      |
| :---------------------------- | :------------------------------------------------------------------------------------------- |
| `app/`                        | **Routing Only:** `page.tsx`, `layout.tsx`, `loading.tsx`. Minimal logic.                    |
| `app/api/`                    | **API Routes:** Thin request handlers — validate with Zod, call `src/lib/`, stream response. |
| `app/dashboard/`              | **Mission UI:** Timeline, approval cards, tool invocation cards, command input.              |
| `app/dashboard/hooks/`        | **Chat State:** `useVanguardChat.ts` — streaming, message management, approval flow.         |
| `app/dashboard/components/`   | **Dashboard Features:** `ApprovalCard`, `ToolInvocationCard`, `TimelineItem`, `AgentBadge`.  |
| `app/api/chat/`               | **Route Helpers:** `approvalGuards.ts`, `locks.ts`, `missionRequest.ts`, `streaming.ts`, `telemetry.ts` — extracted from `route.ts`. |
| `app/governance/`             | **Governance Ledger:** NIST-aligned audit view, trust score display, PDF export.             |
| `app/governance/lib/`         | **Governance Logic:** ViewModel builders, ledger row builders, trust score derivation, checkpoint parsing. |
| `app/governance/hooks/`       | **Governance State:** `useGovernanceData.tsx` — data fetching hook.                          |
| `app/components/ui/`          | **Primitives:** `MissionNavButton`, `MissionActionButton`.                                   |
| `app/components/page-states/` | **Shell States:** `ErrorPage`, `LoadingPage`, `EmptyStatePage`, `NotFoundPage`.              |
| `src/lib/agent/`              | **LangGraph Core:** `graph.ts` (state machine), `state.ts`, `tools.ts`, `checkpointer.ts`.   |
| `src/lib/approval/`           | **Authorization Policy:** `policy.ts`, `hash.ts`, `types.ts`.                                |
| `src/lib/auth/`               | **Session & RBAC:** `session.ts`, `rbac.ts`, `permissions.ts`, `csrf.ts`.                    |
| `src/lib/governance/`         | **Server-Side Governance:** `loadGovernanceSnapshot.ts` (Redis read), `renderGovernancePdf.ts` (PDF generation). |
| `src/lib/vulnerability/`      | **CVE Enrichment:** NVD/advisory fetching, finding deduplication.                            |
| `src/lib/chat/`               | **Streaming Utilities:** Checkpoint-to-UI message conversion.                                |
| `src/lib/langchain/`          | **LangChain Glue:** `reviveLangchainMessages.ts` — deserialize Redis JSON.                   |
| `src/lib/runtime/`            | **Environment:** `redteam.ts`, `vectorClient.ts`, `healthProbes.ts`.                         |
| `src/lib/audit/`              | **Evidence:** Mission evidence schema and serialization.                                     |
| `src/lib/recon/`              | **Reconnaissance:** RDAP domain lookup.                                                      |
| `src/lib/browser/`            | **Client Utilities:** `downloadBlob.ts` — file download handler.                             |
| `mcp-server/`                 | **MCP Server:** Standalone Node.js server exposing `ping` and `domain_whois` tools.          |
| `tests/`                      | **E2E Tests:** Playwright specs — dashboard, governance, red team.                           |
| `scripts/`                    | **Ops Scripts:** `check-env-parity.mjs`, `verify-ready.mjs`. Pre-deploy tooling.             |
| `docs/`                       | **Documentation:** Architecture flows, security advisory, hardening roadmap, runbook.        |

### Naming Conventions & Hygiene

- **Markdown Files:** All `.md` files must have **ALL_CAPS** names (e.g., `README.md`, `CLAUDE.md`, `AGENTS.md`). Extension stays lowercase.
- **React Hooks:** camelCase filenames beginning with `use` (e.g., `useVanguardChat.ts`, `useGovernanceData.tsx`).
- **Components:** PascalCase filenames (e.g., `ApprovalCard.tsx`, `MissionNavButton.tsx`).
- **Lib Utilities:** camelCase filenames, purpose-descriptive (e.g., `reviveLangchainMessages.ts`, `buildGovernanceViewModel.ts`).
- **Type Exports:** PascalCase for all interfaces/types (e.g., `OperatorRole`, `ApprovalContextV1`, `VanguardStateAnnotation`).

### TypeScript Strictness

- **No `any` types:** Never use `any`. Use `unknown` with a type guard, explicit interfaces, or `Record<string, unknown>` where the shape is dynamic.
- **No implicit reliance on inference for state:** When calling `useState`, `useRef`, always annotate the generic — e.g., `useState<boolean>(false)`, `useRef<AbortController | null>(null)`.
- **Double-cast pattern for test fixtures only:** Use `as unknown as TargetType` exclusively for intentionally incomplete test stubs. Never in production code.
- **Zod for all boundaries:** Validate all external inputs (API bodies, tool args, env vars) with Zod schemas before use.

### Architectural Rules

- **No Magic Strings:** Status text, label strings, and route constants belong in `[feature].constants.ts` files or `src/lib/` constants modules, not inline.
- **Path Aliases:** Strictly use `@/*` for all internal imports. Never use relative `../../` paths that cross directory boundaries.
- **Colocation:** One-off hooks or components stay next to the feature until reuse is required across multiple routes — then promote to `app/components/ui/` or `src/lib/`.
- **Server-First:** API routes and `src/lib/` are server-side. Never import server-only modules (Redis, LangGraph, Anthropic) into client components. Mark client components explicitly with `"use client"`.
- **Route Handler Structure:** Complex route handlers extract their sub-concerns into adjacent helper files co-located in the same directory (see `app/api/chat/` for the canonical example: `approvalGuards.ts`, `locks.ts`, `missionRequest.ts`, `streaming.ts`, `telemetry.ts`). Authorization checks (`requestGuards.ts`) run first, always.
- **No Redundant Guards:** Trust Zod's parse results. Do not re-validate already-validated data downstream.

## 5. Agent Architecture

The core of Vanguard is a three-node LangGraph state machine in `src/lib/agent/graph.ts`.

### Agent Flow

```
Supervisor → (approval gate) → Scout → Auditor
```

1. **Supervisor Node** — Parses mission intent, validates target via RDAP preflight, classifies tool risk, prepares `ApprovalContextV1` payload, sets `isPendingApproval: true`.
2. **Scout Node** — Executes only after operator approval. Runs `tavily_search` and `domain_whois` tools. Collects raw intelligence findings.
3. **Auditor Node** — Correlates evidence, queries NVD/advisories for CVE enrichment, deduplicates findings, produces the final mission brief.

### State Schema (`VanguardStateAnnotation`)

All state changes flow through `src/lib/agent/state.ts`. Key fields:

| Field                    | Type                     | Purpose                                        |
| :----------------------- | :----------------------- | :--------------------------------------------- |
| `messages`               | `BaseMessage[]`          | Full LangChain message history                 |
| `target`                 | `string`                 | Normalized recon target (domain)               |
| `isPendingApproval`      | `boolean`                | Hard interrupt gate — pauses stream            |
| `isAuthorized`           | `boolean`                | Set by operator approval; unlocks Scout        |
| `scoutHasRun`            | `boolean`                | Idempotency guard — prevents double-run        |
| `missionAborted`         | `boolean`                | Operator abort flag                            |
| `pendingApprovalContext` | `ApprovalContextV1`      | Full context payload for HITL card             |
| `pendingApprovalHash`    | `string`                 | Integrity hash binding approval to context     |
| `approvalHistory`        | `ApprovalDecision[]`     | Full decision trail                            |
| `vulnerabilities`        | `VulnerabilityFinding[]` | Deduplicated CVE findings                      |
| `iterationCount`         | `number`                 | Loop iteration counter                         |
| `next`                   | `string`                 | Routing cursor: supervisor \| scout \| auditor |

### Tool Allowlist & Risk Classification

Defined in `src/lib/approval/policy.ts`:

| Tool            | Risk     | Side Effect               |
| :-------------- | :------- | :------------------------ |
| `domain_whois`  | `low`    | `read_only_network_query` |
| `tavily_search` | `medium` | `read_only_public_data`   |

Any tool not on the allowlist is classified `high` / `execution_high_risk` and blocked.

### Approval Binding

Approval contexts are cryptographically bound: `context hash + arg hash + thread ID + approval ID`. TTL is 10 minutes. Expired or mismatched approvals are rejected. See `src/lib/approval/hash.ts`.

### Checkpointing

All agent state is persisted to Upstash Redis via the custom `UpstashCheckpointer` in `src/lib/agent/checkpointer.ts`. Missions are replayable from any saved checkpoint. `reviveLangchainMessages.ts` handles deserialization of `BaseMessage` instances from Redis JSON.

## 6. Auth & RBAC

- **Token:** HTTP-only JWT in `__Host-vanguard-session` cookie, signed with `jose`
- **Claims:** `sub` (username), `role`, `iat`, `exp`
- **Roles (ascending rank):** `viewer (1)` → `analyst (2)` → `admin (3)`
- **Permissions:**
  - `viewer`: `ui:access` (read-only)
  - `analyst`: `ui:access` + `mission:run`
  - `admin`: `ui:access` + `mission:run` + `audit:evidence:read`
- **Middleware:** `proxy.ts` (Next.js middleware) intercepts all routes, validates token, enforces role-based permission. CSRF token validated on mutating requests.
- **E2E Bypass:** `AUTH_E2E_BYPASS=true` short-circuits session validation for Playwright. Never set this in production.

## 7. UI Consistency & Mission Control Aesthetic

Strict adherence to the "Mission Control" aesthetic is mandatory. Do not use ad-hoc Tailwind classes for interactive states if a primitive component exists.

- **Component Reuse:** Prioritize `MissionNavButton`, `MissionActionButton`, `AgentBadge`, `ApprovalCard`. If a UI pattern appears more than twice, extract it into `app/components/ui/`.
- **Color Discipline:**
  - **Cyan-500/400/600:** Active protocol engagement, interactive states, AI stream indicators
  - **Slate-950/900/800:** Passive containers, card backgrounds, neutral feed areas
  - **Emerald/Amber/Red:** Functional status only — success / warning / alert
  - Never use off-palette accent colors without an explicit decision from the Architect
- **Font Stack:**
  - Body: Geist Sans
  - Code / terminal / metadata: Geist Mono
- **Tactical Font Scale:**
  - **`text-[10px]` font-bold uppercase tracking-wider:** Button labels, card headers, primary status tags
  - **`text-[10px]` mono:** Metadata labels, system info, secondary status
  - **`text-[8px]` or `text-[9px]` uppercase:** Row-level tags, minor indicators
- **Borders & Depth:**
  - Resting: `border-slate-800`
  - Hover/Active: `border-cyan-500/50`
  - Backgrounds: `bg-slate-950/50` (cards), `bg-slate-900` (hover)
  - Shadows: `shadow-lg shadow-black/40`

## 8. Testing Protocol

### Unit / Integration Tests (Vitest)

- Test files colocate with source: `app/**/*.test.ts`, `src/**/*.test.ts`
- Run: `npm test` (single pass), `npm run test:watch` (watch), `npm run test:coverage` (coverage report)
- **No mocking of business logic boundaries** — if a function calls Upstash Redis or LangGraph, test it with a real backend or an explicit integration harness.
- Use `as unknown as TargetType` for intentionally incomplete test stubs only. Document why.

### E2E Tests (Playwright)

- Specs: `tests/dashboard.spec.ts`, `tests/governance.spec.ts`, `tests/redteam.spec.ts`
- CI: Chromium only, 2 retries, 20-minute timeout. Server started with `AUTH_E2E_BYPASS=true`.
- Local: All browsers, parallel, HTML reporter. Run `npm run e2e:ui` for visual debugging.
- **E2E tests do not hit real infrastructure in CI.** Network calls to Anthropic/Upstash are either intercepted via `page.route()` or guarded by `test.skip(!process.env.E2E_LIVE, ...)`.
- **Live integration tests** (marked `E2E_LIVE=1`) are local-only and require real credentials. Never run in CI.

### CI Pipeline (`.github/workflows/ci.yml`)

Jobs run in parallel. Order in file: security-audit → lint → type-check → build → mcp-server → unit-tests → e2e.

| Job            | Command                                 |
| :------------- | :-------------------------------------- |
| Security Audit | `npm run audit:high`                    |
| Lint           | `npm run lint`                          |
| Type Check     | `npm run type-check`                    |
| Build          | `npm run build`                         |
| MCP Server     | Type-check + audit within `mcp-server/` |
| Unit Tests     | `npm test` + coverage artifact upload   |
| E2E            | Playwright on Chromium, retries enabled |

## 9. Environment Variables

**Required for full runtime:**

| Variable                       | Purpose                          |
| :----------------------------- | :------------------------------- |
| `ANTHROPIC_API_KEY`            | Claude API access                |
| `TAVILY_API_KEY`               | Web intelligence (Scout tool)    |
| `UPSTASH_REDIS_REST_URL`       | Mission checkpoint store         |
| `UPSTASH_REDIS_REST_TOKEN`     | Redis auth                       |
| `UPSTASH_VECTOR_REST_URL`      | Governance evidence indexing     |
| `UPSTASH_VECTOR_REST_TOKEN`    | Vector auth                      |
| `APP_BASE_URL` or `VERCEL_URL` | Production URL for health probes |

**Optional / operational:**

| Variable                     | Purpose                                                  |
| :--------------------------- | :------------------------------------------------------- |
| `ANTHROPIC_SUPERVISOR_MODEL` | Override supervisor model (default: `claude-sonnet-4-6`) |
| `ANTHROPIC_SCOUT_MODEL`      | Override scout model (default: `claude-sonnet-4-6`)      |
| `AUTH_E2E_BYPASS`            | Set `true` for Playwright E2E only — never production    |
| `RED_TEAM_MODE`              | Activates red team thread prefix and isolation           |
| `RED_TEAM_UPSTASH_*`         | Separate Upstash creds for red team isolation            |
| `LANGSMITH_API_KEY`          | LangSmith tracing/telemetry                              |
| `VERIFY_TARGET_ENV`          | `production` vs non-production flag for health checks    |

Run `npm run verify:env` to validate all required vars before deploying.

## 10. Operational Commands

| Command                 | Purpose                                      |
| :---------------------- | :------------------------------------------- |
| `npm run dev`           | Start development server (hot reload)        |
| `npm run build`         | Production build                             |
| `npm run start`         | Start production server                      |
| `npm run lint`          | ESLint (`src/**/*.{ts,tsx}`)                 |
| `npm run type-check`    | `tsc --noEmit` full TypeScript check         |
| `npm test`              | Vitest — single pass                         |
| `npm run test:watch`    | Vitest — watch mode                          |
| `npm run test:coverage` | Vitest — coverage report (v8)                |
| `npm run e2e`           | Playwright E2E (headless)                    |
| `npm run e2e:ui`        | Playwright E2E (UI mode, local only)         |
| `npm run mcp`           | Start MCP server                             |
| `npm run verify:env`    | Validate required env vars                   |
| `npm run verify:ready`  | Post-deploy health check against live server |
| `npm run audit:high`    | `npm audit --audit-level=high`               |
