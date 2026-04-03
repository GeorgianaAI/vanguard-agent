"use client";

import { BarChart3, Settings2 } from "lucide-react";
import { useGovernanceData } from "../hooks/useGovernanceData";

export function NistMetricsCards() {
  const { model } = useGovernanceData();
  const measure = model.nistMeasure;
  const manage = model.nistManage;

  return (
    <div
      data-testid="governance-nist-metrics"
      className="grid w-full min-w-0 grid-cols-1 gap-6 md:grid-cols-2"
    >
      <div
        data-testid="governance-nist-measure"
        className="flex min-h-[11rem] w-full min-w-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/20 p-6 md:min-h-[12rem] md:p-8"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            <BarChart3 className="h-4 w-4 shrink-0 text-emerald-500" /> NIST:
            MEASURE
          </h3>
          <span className="shrink-0 font-mono text-[9px] text-emerald-500">
            {measure.mode}
          </span>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex justify-between gap-2 text-[11px]">
            <span className="text-slate-500 uppercase">
              {measure.label}
            </span>
            <span className="shrink-0 font-mono text-[10px] tracking-widest text-emerald-400">
              {measure.value}
            </span>
          </div>
          <div className="h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-slate-800 shadow-inner">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${measure.percent}%` }}
            />
          </div>
        </div>
      </div>

      <div
        data-testid="governance-nist-manage"
        className="flex min-h-[11rem] w-full min-w-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/20 p-6 md:min-h-[12rem] md:p-8"
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="flex min-w-0 items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
            <Settings2 className="h-4 w-4 shrink-0 text-cyan-500" /> NIST:
            MANAGE
          </h3>
          <span className="shrink-0 font-mono text-[9px] text-cyan-500">
            {manage.mode}
          </span>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="flex justify-between gap-2 text-[11px]">
            <span className="text-slate-500 uppercase">{manage.label}</span>
            <span className="shrink-0 font-mono text-[10px] tracking-widest text-cyan-400">
              {manage.value}
            </span>
          </div>
          <div className="h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-slate-800 shadow-inner">
            <div
              className="h-full bg-cyan-500"
              style={{ width: `${manage.percent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
