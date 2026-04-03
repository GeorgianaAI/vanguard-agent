"use client";

import { FileCheck, History } from "lucide-react";

import { useGovernanceData } from "../hooks/useGovernanceData";

export function EvidenceTrail() {
  const { model } = useGovernanceData();
  const evidenceTrail = model.evidenceTrail;

  return (
    <aside
      data-testid="governance-evidence-trail"
      className="order-2 col-span-12 w-full min-w-0 max-w-full lg:col-span-4 lg:order-2 lg:self-start"
    >
      <div className="box-border flex h-fit w-full min-w-0 max-w-full flex-col overflow-x-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-6 text-left backdrop-blur-xl md:p-8 lg:sticky lg:top-8">
        <div className="mb-8 flex shrink-0 items-center gap-3">
          <History className="h-5 w-5 shrink-0 text-indigo-400" />
          <h2 className="min-w-0 text-sm font-black tracking-widest uppercase">
            Evidence Trail
          </h2>
        </div>

        <div className="relative flex min-w-0 max-w-full flex-col gap-8 overflow-x-hidden">
          <div
            className="pointer-events-none absolute bottom-4 left-2.5 top-10 w-px border-l border-dashed border-slate-800"
            aria-hidden
          />
          {evidenceTrail.map((item) => (
            <div
              key={item.id}
              data-testid={`governance-evidence-${item.id}`}
              className="group relative min-w-0 max-w-full pl-8 pr-0"
            >
              <div className="absolute left-0 top-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-950 shadow-lg transition-all group-hover:border-cyan-500">
                <FileCheck className="h-2.5 w-2.5 text-slate-500 transition-colors group-hover:text-cyan-400" />
              </div>
              <p className="break-words text-[11px] font-black uppercase tracking-widest text-slate-200">
                {item.label}
              </p>
              <p className="mt-1 break-words text-[10px] leading-relaxed text-slate-500">
                {item.desc}
              </p>
              <span className="mt-2 inline-block max-w-full break-all rounded bg-cyan-950/20 px-1.5 font-mono text-[9px] uppercase tracking-tighter text-cyan-600">
                {item.id}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
