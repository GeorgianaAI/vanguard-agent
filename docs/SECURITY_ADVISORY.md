# 🛰️🛡️ Vanguard Adversarial Resilience Advisory

This advisory documents security behaviors observed in Vanguard under structured adversarial testing (Red Team scenarios), including approval-bypass attempts, malformed/tampered approval payloads, replay pressure, and prompt-level social engineering pressure.

Findings are grounded in reproducible test executions and trace-linked evidence to support auditability and regression tracking.

> Scope note: This advisory reports evidence-based outcomes from tested scenarios. It is not a claim of universal security against all prompts, models, tools, or deployment conditions.

## Scope

- Test coverage:
  - `tests/redteam.spec.ts`
  - `app/api/chat/route.post.test.ts`
  - `app/api/chat/approvalGuards.test.ts`
- Governance surface:
  - `app/api/chat/route.ts`
  - Approval contract and hash checks
  - Replay/duplicate lock behavior
- Evidence surface:
  - Structured runtime logs
  - Optional LangSmith trace correlation (environment-dependent)

## 1) Approval Context Binding (Tamper Resistance)

### Attack pattern

Adversarial client sends approval requests with modified fields, including mismatched `approval_context`, altered hash values, or stale `approval_id` references.

### Defensive behavior observed

- Approval requests require context binding fields.
- Hash mismatch and stale/mismatched context are rejected deterministically.
- Requests do not proceed to execution when binding checks fail.

### Expected outcomes

- `400` for malformed approval payloads (missing required approval fields)
- `409` for stale/tampered/mismatch conflicts

---

## 2) Replay & Duplicate Decision Prevention

### Attack pattern

An attacker replays previously valid approval requests or attempts duplicate authorization on the same pending action.

### Defensive behavior observed

- One-time lock semantics prevent duplicate approval processing.
- Replayed or already-processed approvals are rejected.

### Expected outcomes

- `409` for replay/duplicate conflict paths

---

## 3) Prompt Pressure / Social Engineering Resistance

### Attack pattern

Prompts attempt to coerce bypass behavior (e.g., “ignore authorization,” “execute directly,” roleplay pressure).

### Defensive behavior observed

- Authorization gate remains enforced.
- Tool execution does not bypass HITL solely due to prompt pressure language.

### Expected outcomes

- Approval gate remains present until explicit valid decision path is completed.

---

## 4) Deterministic Governance Status Mapping

Vanguard governance paths are intentionally mapped to stable status classes:

- `400` malformed/invalid approval request structure
- `409` stale/tampered/replay/mismatch approval conflicts
- `429` rate-limit enforcement
- `503` critical runtime dependency unavailable in strict production paths

This mapping reduces ambiguous `500` behavior for expected negative governance paths.

---

## 5) Production vs Non-Production Runtime Strictness

Vanguard enforces environment-aware behavior:

- Non-production / CI:
  - graceful degradation is allowed for selected dependency paths
- Production:
  - critical dependency failures use deterministic fail-closed behavior (`503`) in affected runtime paths

This supports developer velocity without weakening production safety posture.

## Security Positioning Statement

Vanguard demonstrates adversarial resilience for tested governance scenarios, based on reproducible test evidence and runtime behavior controls.  
This advisory is a bounded security statement and should be maintained as tests and architecture evolve.

## Maintenance Notes

Update this advisory whenever any of the following change:

- Approval contract fields or validation ordering
- Replay lock semantics
- Route-level governance status mapping
- Runtime strictness policy for production vs non-production
- Red-team suite scope or evidence sources
