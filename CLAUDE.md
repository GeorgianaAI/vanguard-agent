# 🛰️ VANGUARD AGENT | Architecture & Governance

## 1. Project Intent

Vanguard is an autonomous multi-agent recon and governance platform. It orchestrates a supervised AI pipeline (Supervisor → Scout → Auditor) against operator-supplied targets, enforces human-in-the-loop authorization before any network action, and produces a NIST-aligned governance ledger with exportable audit evidence. Every mission is stateful, replayable, and cryptographically bound to its approval context. See [Agent Architecture reference](memory) for state schema, tool allowlist, and checkpointing details.

## 2. Technical Stack

See [Tech Stack reference](memory) for full dependency list and command reference.

**App (Vercel):** Next.js 16.2.3 App Router, React 19, TypeScript strict, Tailwind CSS v4, Vercel AI SDK, LangGraph (`@langchain/langgraph`), Anthropic Claude (`claude-sonnet-4-6`), Tavily, Upstash Redis + Vector, `jose` (JWT), Zod v4, `pdf-lib`, Sentry, Vitest + Playwright.

**MCP Server (stdio):** `@modelcontextprotocol/sdk` — standalone subprocess exposing `vanguard_ping` and `domain_whois` (shared RDAP helper at `src/lib/recon/`).

## 2.1 Version Governance & Stability Lock

Locked to **Next.js 16.2.3** (exact pin) and **React 19**. Never upgrade without explicit Architect decision. Read `node_modules/next/dist/docs/` before using any Next.js API. Ignore upgrade notices.

## 3. Development Workflow (The Sprint Protocol)

- **Feature Branches:** `feat/`, `fix/`, `refactor/` for all code changes.
- **Atomic Commits:** Group by concern — UI/Layout → API/Routes → Agent Logic → Tests. Create several commits per feature.
- **No AI tags:** Never include `Co-authored-by: Claude` or any AI attribution in commit messages. Never. On any branch.
- **No Merges:** Pushing to remote is encouraged; merging is restricted to the Architect.
- **Branch Hygiene Gate:** Before creating any new branch, run `git branch` and check for unmerged feature branches. If any exist, stop, list them, and wait for Architect confirmation before proceeding.
- **Modular Architecture:** Extract into a co-located `lib/` subdirectory once a feature area grows large. Complex route handlers extract sub-concerns into adjacent helper files (see `app/api/chat/` as the canonical example). Hooks go in a co-located `hooks/` directory.
- **Separation of Concerns:** Keep agent/business logic (`src/lib/`) out of UI (`app/`). Complex route handlers never keep everything in a single `route.ts`.

## 4. Code Layout & Architecture

Thin entrypoints. Extract once a file exceeds ~200–300 lines (sequential functions may reach 400–500).

### Directory Map

| Area                          | Purpose                                                                                             |
| :---------------------------- | :-------------------------------------------------------------------------------------------------- |
| `app/`                        | Routing only: `page.tsx`, `layout.tsx`, `loading.tsx`. Minimal logic.                               |
| `app/api/`                    | Thin route handlers — validate with Zod, call `src/lib/`, stream response                           |
| `app/dashboard/`              | Mission UI: timeline, approval cards, tool invocation cards, command input                          |
| `app/dashboard/hooks/`        | `useVanguardChat.ts` — streaming, message management, approval flow                                 |
| `app/dashboard/components/`   | `ApprovalCard`, `ToolInvocationCard`, `TimelineItem`, `AgentBadge`                                  |
| `app/api/chat/`               | Route helpers: `approvalGuards.ts`, `locks.ts`, `missionRequest.ts`, `streaming.ts`, `telemetry.ts` |
| `app/governance/`             | NIST-aligned audit view, trust score display, PDF export                                            |
| `app/governance/lib/`         | ViewModel builders, ledger row builders, trust score derivation                                     |
| `app/components/ui/`          | Primitives: `MissionNavButton`, `MissionActionButton`                                               |
| `app/components/page-states/` | `ErrorPage`, `LoadingPage`, `EmptyStatePage`, `NotFoundPage`                                        |
| `src/lib/agent/`              | LangGraph core: `graph.ts`, `state.ts`, `tools.ts`, `checkpointer.ts`                               |
| `src/lib/approval/`           | Authorization policy: `policy.ts`, `hash.ts`, `types.ts`                                            |
| `src/lib/auth/`               | Session & RBAC: `session.ts`, `rbac.ts`, `permissions.ts`, `csrf.ts`                                |
| `src/lib/governance/`         | `loadGovernanceSnapshot.ts`, `renderGovernancePdf.ts`                                               |
| `src/lib/vulnerability/`      | CVE enrichment: NVD/advisory fetching, deduplication                                                |
| `src/lib/recon/`              | RDAP domain lookup — shared with MCP server                                                         |
| `mcp-server/`                 | Standalone stdio MCP server                                                                         |
| `tests/`                      | Playwright E2E specs                                                                                |
| `docs/`                       | Architecture flows, security advisory, hardening roadmap, runbook                                   |

### Naming Conventions

- **Markdown:** ALL_CAPS filenames (e.g. `README.md`, `CLAUDE.md`). Extension lowercase.
- **Hooks:** camelCase beginning with `use` (e.g. `useVanguardChat.ts`).
- **Components:** PascalCase (e.g. `ApprovalCard.tsx`).
- **Lib utilities:** camelCase, purpose-descriptive (e.g. `reviveLangchainMessages.ts`).
- **Types/Interfaces:** PascalCase (e.g. `OperatorRole`, `ApprovalContextV1`).

### TypeScript Strictness

- No `any`. Use `unknown` + type guard, explicit interfaces, or `Record<string, unknown>`.
- Always annotate generics: `useState<boolean>(false)`, `useRef<AbortController | null>(null)`.
- `as unknown as TargetType` for test stubs only — never in production code.
- Zod on every external boundary: API bodies, tool args, env vars.

### Architectural Rules

- **No Magic Strings:** Labels, status text, route constants → `[feature].constants.ts` or `src/lib/` modules.
- **Path Aliases:** `@/*` for all internal imports. Never `../../` across directory boundaries.
- **Server-First:** Never import Redis, LangGraph, or Anthropic into client components. Explicit `"use client"` on all client components.
- **Route Handler Structure:** Authorization checks run first, always. Sub-concerns extracted into adjacent helper files.
- **No Redundant Guards:** Trust Zod's parse results downstream.

## 5. Agent Architecture

Three-node LangGraph state machine: **Supervisor → (approval gate) → Scout → Auditor**. See [Agent Architecture reference](memory) for full state schema, node descriptions, tool allowlist, approval binding, and checkpointing.

## 6. Auth & RBAC

HTTP-only JWT (`__Host-vanguard-session`), signed with `jose`. Roles: `viewer (1)` → `analyst (2)` → `admin (3)`. CSRF validated on mutating requests. `AUTH_E2E_BYPASS=true` for Playwright only — never production. See [Auth & RBAC reference](memory) for full permission model.

## 7. UI Consistency & Mission Control Aesthetic

Strict Mission Control aesthetic — mandatory. Never use ad-hoc Tailwind classes for interactive states if a primitive exists.

- **Component Reuse:** Prioritize `MissionNavButton`, `MissionActionButton`, `AgentBadge`, `ApprovalCard`. Extract to `app/components/ui/` if a pattern appears more than twice.
- **Color Discipline:**
  - Cyan-500/400/600: active states, interactive, AI stream indicators
  - Slate-950/900/800: containers, card backgrounds, neutral feed areas
  - Emerald/Amber/Red: functional status only — success / warning / alert
  - No off-palette accents without Architect approval
- **Fonts:** Body: Geist Sans. Code/terminal/metadata: Geist Mono.
- **Tactical Scale:** `text-[10px]` bold uppercase: buttons/headers/tags. `text-[10px]` mono: metadata/system info. `text-[8px]`–`text-[9px]` uppercase: row-level tags.
- **Borders & Depth:** Resting `border-slate-800`. Hover `border-cyan-500/50`. Cards `bg-slate-950/50`. Hover `bg-slate-900`. Shadows `shadow-lg shadow-black/40`.

## 8. Testing Protocol

### Unit / Integration (Vitest)

- Colocate test files: `app/**/*.test.ts`, `src/**/*.test.ts`.
- **No mocking business logic boundaries** — test against a real backend or explicit integration harness.
- `as unknown as TargetType` for incomplete stubs only — document why.

### E2E (Playwright)

- Specs: `tests/dashboard.spec.ts`, `tests/governance.spec.ts`, `tests/redteam.spec.ts`.
- CI: Chromium only, 2 retries, 20-min timeout, started with `AUTH_E2E_BYPASS=true`.
- **E2E never hits real infra in CI.** Calls intercepted via `page.route()` or `test.skip(!process.env.E2E_LIVE)`.
- Live tests (`E2E_LIVE=1`) are local-only — never run in CI.

### CI Pipeline

security-audit → lint → type-check → build → mcp-server → unit-tests → e2e. See [Tech Stack reference](memory) for full job/command table.

## 10. Denied Permission to Secret File Access

Hard rule: **never** read, search, open, cat, grep, ripgrep, summarize, or inspect real secret-bearing files **under any circumstance** unless the user explicitly overrides this rule for the current task. This includes `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.test`, any other real secret `.env.*` variants, `*.pem`, `*.key`, and `~/.ssh/**`. If a task requires knowing which keys or variables exist, read `.env.example` only. If a task appears to require actual secret values from a real env file, stop and ask the user instead of accessing that file.

## 10. Operational Commands

See [Tech Stack reference](memory) for full command list.

```bash
npm run dev          # dev server (hot reload)
npm run build        # production build
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
npm test             # Vitest single pass
npm run e2e          # Playwright E2E headless
npm run mcp          # start MCP server (stdio)
npm run verify:env   # validate required env vars
```
