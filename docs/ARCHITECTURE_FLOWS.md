# 🛰️🏛️ Vanguard Architecture Flows

This document captures the core runtime flows that define Vanguard’s current behavior:

- Human-in-the-Loop (HITL) governance and anti-tamper controls
- Authentication and RBAC enforcement
- Runtime dependency strictness (degraded vs fail-closed behavior)

Use this file as the engineering source of truth for flow-level behavior.  
When implementation changes, update this doc in the same PR.

---

## How to Read These Diagrams

- **UI** = operator-facing dashboard and login pages.
- **Middleware** = request gate for auth + permissions.
- **/api/chat** = mission orchestration and HITL enforcement.
- **LangGraph** = agent decision/flow execution engine.
- **Redis** = lock/state/persistence substrate for mission safety controls.

Status code conventions used across flows:

- `400` malformed request payload
- `401` unauthenticated
- `403` authenticated but unauthorized
- `409` stale/tampered/replay approval conflict
- `429` rate-limited
- `503` critical runtime dependency unavailable (production strict mode)

---

## 1) HITL Approval + Anti-Tamper Flow

### Why this exists

Vanguard is designed for governed execution.  
No external action should proceed through the approval path unless the operator is approving the **exact** context currently pending.

### What the operator should understand

When the dashboard asks for authorization, the action is bound to a specific approval context (`approval_id` + hash + freshness window).  
Approving stale or modified payloads is intentionally rejected.

### What this flow guarantees

- Approval requests are validated before execution.
- Tampered or stale approvals are blocked deterministically.
- Replay is blocked via one-time lock semantics.
- Mission continues only after policy/guard checks pass.

### Diagram

```mermaid
sequenceDiagram
autonumber
participant UI as Dashboard UI
participant MW as Middleware
participant API as /api/chat
participant G as LangGraph
participant RS as Redis

UI->>MW: POST mission request
MW->>API: Forward + x-actor-id/x-actor-role
API->>G: invoke(mission)
G-->>API: AUTHORIZATION_REQUIRED + approval_context
API-->>UI: stream approval card (approval_id, hash, risk, expiry)

UI->>MW: POST approval (isApproval, approved, approval_id, approval_context_hash)
MW->>API: Forward actor headers
API->>API: Validate body (400 malformed)
API->>API: Verify hash/expiry/stale checks (409 mismatch/stale)
API->>RS: SET NX lock (one-time approval)
API->>G: continue execution
API-->>UI: stream findings / completion
```

---

## 2) Auth + RBAC Request Flow

### Why this exists

Vanguard separates identity from capability:

- Identity is established at login.
- Capability is enforced per route with permissions.

### What the operator should understand

A valid session alone is not enough for every action.  
Role/permission controls decide whether the request can proceed to sensitive routes (mission execution, audit export, etc.).

### What this flow guarantees

- Unauthenticated users are redirected/blocked.
- Unauthorized users receive deterministic `403`.
- Authorized requests pass with actor identity headers for downstream audit linkage.

### Diagram

```mermaid
flowchart TD
A[Operator opens /login] --> B[POST /api/auth/login]
B --> C{Credentials valid?}
C -- no --> D[401 Invalid credentials]
C -- yes --> E[Issue JWT session token]
E --> F[Set HttpOnly cookie]
F --> G[Redirect/push to /dashboard]

G --> H[Request protected route]
H --> I[Middleware verifies session cookie]
I --> J{Token valid?}
J -- no --> K[401 for API / redirect to /login]
J -- yes --> L[Check permission by route]
L --> M{Allowed role/permission?}
M -- no --> N[403 Forbidden]
M -- yes --> O[Forward request + actor headers]
```

---

## 3) Runtime Strictness Policy (Health + Dependencies)

### Why this exists

Vanguard must remain developer-friendly in non-production while being strict and predictable in production.

### What the operator should understand

Behavior differs by environment intentionally:

- Non-prod/CI can degrade to support iteration and test startup.
- Production fails closed for critical dependency outages.

### What this flow guarantees

- No silent production drift when critical infra is missing.
- Consistent health semantics and deterministic failure behavior.
- Clear operational signal for incident triage.

### Diagram

```mermaid
flowchart LR
A[Incoming runtime request] --> B{Environment?}

B -- Non-prod/CI --> C[Allow degraded mode]
C --> D[Warn logs + degraded health]
D --> E[Continue where safe]

B -- Production --> F[Check critical deps: Redis/Vector]
F --> G{Missing/error?}
G -- yes --> H[Deterministic 503]
G -- no --> I[Proceed normally]

I --> J[Health endpoint returns status]
H --> J
```

---

## Update Rules (Keep This Accurate)

Update this document whenever any of the following changes:

- Approval contract fields or approval validation order
- Route permission model or protected route set
- Dependency strictness policy or health endpoint semantics
- Actor header propagation behavior

If a code change alters runtime behavior but this doc is not updated, treat that as an incomplete PR.

---

## Suggested Companion Docs

- `docs/OPERATIONS_RUNBOOK.md` for incident handling and operational procedures
- `README.md` for high-level product narrative
- (Optional) `docs/WHITEPAPER.md` for external architecture narrative snapshots
