export const LEDGER_MOCK = [
  {
    time: "14:20:01",
    agent: "SCOUT",
    action: "Tavily Search",
    status: "Authorized",
    risk: "Low",
  },
  {
    time: "14:21:45",
    agent: "SUPERVISOR",
    action: "Tool Delegation",
    status: "Policy Match",
    risk: "Neutral",
  },
  {
    time: "14:25:10",
    agent: "AUDITOR",
    action: "Final Synthesis",
    status: "Verified",
    risk: "Low",
  },
] as const;

export const ADVISORY_MOCK = [
  {
    id: "CVE-2024-22024",
    stack: "OpenSSL 3.0",
    severity: "CRITICAL",
    cvss: "9.8",
  },
  {
    id: "CVE-2023-44487",
    stack: "HTTP/2 Rapid Reset",
    severity: "HIGH",
    cvss: "7.5",
  },
] as const;

export const EVIDENCE_TRAIL = [
  {
    label: "Vulnerability Triage",
    desc: "CVE context enriched via secondary scout loop.",
    id: "GOV-CVE-01",
  },
  {
    label: "Human-in-the-Loop Gate",
    desc: "Tool execution paused for operator signature.",
    id: "GOV-02",
  },
  {
    label: "Auditor Verification",
    desc: "Mission summary validated for ground truth.",
    id: "GOV-03",
  },
] as const;
