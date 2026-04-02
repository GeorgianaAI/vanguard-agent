import Link from "next/link";
import {
  AlertTriangle,
  ChevronLeft,
  ExternalLink,
  FileCheck,
  Gavel,
  History,
  Scale,
} from "lucide-react";

const LEDGER_MOCK = [
  {
    time: "14:20:01",
    agent: "SCOUT",
    action: "CVE Lookup: Nginx",
    status: "Authorized",
    risk: "Neutral",
  },
  {
    time: "14:21:45",
    agent: "AUDITOR",
    action: "Signal Correlation",
    status: "Verified",
    risk: "High",
  },
] as const;

const ADVISORY_MOCK = [
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

const EVIDENCE_TRAIL = [
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

export default function VanguardGovernancePage() {
  return (
    <div className="isolate min-h-screen w-full overflow-x-hidden bg-slate-950 text-slate-100 selection:bg-cyan-500/30">
      <div className="mx-auto max-w-[1200px] px-4 pb-24 pt-8 sm:px-6 md:p-8">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 transition-all hover:border-cyan-500/50 hover:bg-slate-900 hover:text-cyan-400 shadow-lg shadow-black/40 focus:outline-none"
          >
            <ChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
            <span className="leading-none">Back to Command Center</span>
          </Link>
        </div>

        <main data-testid="governance-ledger">
          <header className="mb-10 flex flex-col gap-6 border-b border-slate-800 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-cyan-500">
                <Scale className="h-4 w-4" />
                <span className="text-[10px] font-black tracking-[0.3em] uppercase opacity-80">
                  Operational Integrity
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tighter uppercase sm:text-4xl">
                Governance Ledger
              </h1>
              <p className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-widest">
                NIST AI RMF v1.0 Alignment • Advisory Context: ENABLED
              </p>
            </div>

            <div className="flex gap-4">
              <div className="rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-2 text-right">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  System Trust Score
                </p>
                <p className="text-xl font-black text-emerald-400">98.4%</p>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-12 gap-6">
            <section className="col-span-12 space-y-6 text-left lg:col-span-8">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/20 p-6 backdrop-blur-xl">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Gavel className="h-5 w-5 text-cyan-500" />
                    <h2 className="text-sm font-black tracking-widest uppercase">
                      Decision Integrity Ledger
                    </h2>
                  </div>
                </div>

                <div className="space-y-3">
                  {LEDGER_MOCK.map((log) => (
                    <div
                      key={`${log.time}-${log.agent}`}
                      className="flex flex-col gap-2 rounded-lg border border-slate-800/30 bg-slate-950/30 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-wrap items-center gap-3 text-[10px] sm:gap-4">
                        <span className="font-mono text-slate-600">
                          {log.time}
                        </span>
                        <span className="font-black text-cyan-500/70">
                          [{log.agent}]
                        </span>
                        <span className="font-bold text-slate-300 uppercase">
                          {log.action}
                        </span>
                      </div>
                      <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-500">
                        {log.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Placeholder CVE panel; live enrichment from recon/OSINT is a future task. */}
              <div className="rounded-2xl border border-amber-900/30 bg-amber-950/5 p-6 backdrop-blur-xl">
                <div className="mb-6 flex flex-col gap-2 border-b border-amber-900/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h2 className="text-sm font-black tracking-widest uppercase text-amber-200">
                      Advisory Signals
                    </h2>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Enriched via OSINT Scope
                  </span>
                </div>

                <div className="grid gap-4">
                  {ADVISORY_MOCK.map((cve) => (
                    <div
                      key={cve.id}
                      className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition-all hover:border-amber-500/30"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="font-mono text-xs font-black text-amber-500">
                            {cve.id}
                          </span>
                          <span className="border-l border-slate-700 pl-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            {cve.stack}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[9px] font-black text-rose-500">
                            {cve.severity}
                          </span>
                          <span className="text-[10px] font-bold tabular-nums text-slate-500">
                            CVSS {cve.cvss}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 text-[10px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                        <p className="italic">
                          Scout detected matching version string in target
                          response headers.
                        </p>
                        <button
                          type="button"
                          className="inline-flex cursor-default items-center gap-1 font-black uppercase tracking-tighter text-slate-500"
                          disabled
                          aria-disabled="true"
                        >
                          Audit Evidence{" "}
                          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <aside className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-left backdrop-blur-xl lg:col-span-4">
              <div className="mb-8 flex items-center gap-3">
                <History className="h-5 w-5 text-indigo-400" />
                <h2 className="text-sm font-black tracking-widest uppercase">
                  Evidence Trail
                </h2>
              </div>

              <div className="relative space-y-8">
                <div className="absolute left-2.5 top-2 h-[85%] w-px border-l border-dashed border-slate-800" />
                {EVIDENCE_TRAIL.map((item) => (
                  <div key={item.id} className="group relative pl-8">
                    <div className="absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full border border-slate-700 bg-slate-950 transition-colors group-hover:border-cyan-500">
                      <FileCheck className="h-2.5 w-2.5 text-slate-500 transition-colors group-hover:text-cyan-400" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-200">
                      {item.label}
                    </p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                      {item.desc}
                    </p>
                    <span className="mt-2 inline-block rounded bg-cyan-950/20 px-1.5 font-mono text-[9px] uppercase tracking-tighter text-cyan-600">
                      {item.id}
                    </span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
