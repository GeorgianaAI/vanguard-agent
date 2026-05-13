<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# 🛰️ VANGUARD AGENT | Architecture & Governance

## 1. Project Intent

Vanguard is an autonomous multi-agent recon and governance platform. It orchestrates a supervised AI pipeline (Supervisor → Scout → Auditor) against operator-supplied targets, enforces human-in-the-loop authorization before any network action, and produces a NIST-aligned governance ledger with exportable audit evidence. Every mission is stateful, replayable, and cryptographically bound to its approval context. See [Agent Architecture reference](memory) for state schema, tool allowlist, and checkpointing details.

## 2. Denied Permission to Secret File Access

Hard rule: **never** read, search, open, cat, grep, ripgrep, summarize, or inspect real secret-bearing files **under any circumstance** unless the user explicitly overrides this rule for the current task. This includes `.env`, `.env.local`, `.env.development`, `.env.production`, `.env.test`, any other real secret `.env.*` variants, `*.pem`, `*.key`, and `~/.ssh/**`. If a task requires knowing which keys or variables exist, read `.env.example` only. If a task appears to require actual secret values from a real env file, stop and ask the user instead of accessing that file.
