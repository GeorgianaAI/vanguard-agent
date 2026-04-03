"use client";

import { Gavel, ShieldAlert } from "lucide-react";

import { useGovernanceData } from "../hooks/useGovernanceData";
import { GovernanceLedgerLoadingPanel } from "./GovernanceLedgerLoadingPanel";

export function DecisionIntegrityLedger() {
  const { model, loadPhase, threadId } = useGovernanceData();
  const ledgerRows = model.ledgerRows;
  const hasMissionLedger = model.source === "derived";
  const synchronizing = loadPhase === "synchronizing";
  const uplinkBadge = synchronizing && Boolean(threadId);

  return (
    <div
      data-testid="governance-decision-ledger"
      className="w-full min-w-0 max-w-full rounded-2xl border border-slate-800 bg-slate-900/20 p-6 pb-8 backdrop-blur-xl md:p-8"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Gavel className="h-5 w-5 shrink-0 text-cyan-500" />
          <h2 className="text-sm font-black tracking-widest uppercase">
            Decision Integrity Ledger
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {hasMissionLedger ? (
            <span
              data-testid="governance-ledger-live-badge"
              className="rounded border border-cyan-500/20 bg-cyan-950/40 px-2 py-1 text-[10px] font-bold text-cyan-400"
            >
              LIVE AUDIT ACTIVE
            </span>
          ) : synchronizing ? (
            <span
              data-testid="governance-ledger-sync-badge"
              className={`rounded border px-2 py-1 text-[10px] font-bold animate-pulse ${
                uplinkBadge
                  ? "border-cyan-500/30 bg-cyan-950/30 text-cyan-400/90"
                  : "border-slate-600/40 bg-slate-900/50 text-slate-500"
              }`}
            >
              {uplinkBadge ? "UPLINK SYNC" : "SESSION INIT"}
            </span>
          ) : (
            <span
              data-testid="governance-ledger-standby-badge"
              className="rounded border border-slate-700/50 bg-slate-900/50 px-2 py-1 text-[10px] font-bold text-slate-500"
            >
              AUDIT STANDBY
            </span>
          )}
        </div>
      </div>

      {synchronizing ? (
        <GovernanceLedgerLoadingPanel />
      ) : hasMissionLedger ? (
        <div className="min-w-0 space-y-4">
          {ledgerRows.map((log) => (
            <div
              key={`${log.time}-${log.agent}`}
              data-testid={`governance-ledger-row-${log.agent}`}
              className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-800/50 bg-slate-950/50 p-4 transition-colors hover:bg-slate-900/50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
                <span className="font-mono text-[10px] text-slate-600">
                  {log.time}
                </span>
                <span className="text-[10px] font-black text-cyan-500/70">
                  [{log.agent}]
                </span>
                <span className="min-w-0 break-words text-xs font-bold text-slate-300">
                  {log.action}
                </span>
              </div>
              <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 sm:shrink-0 sm:justify-end">
                <span className="text-[10px] font-bold uppercase tracking-tighter text-emerald-500">
                  {log.status}
                </span>
                <span className="text-[10px] font-bold uppercase italic text-slate-500">
                  Risk: {log.risk}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          data-testid="governance-ledger-standby"
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800/50 bg-slate-950/20 py-20"
        >
          <div className="mb-2 flex items-center gap-2">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-full w-full rounded-full bg-blue-500/20 blur-md animate-pulse" />
              <ShieldAlert
                className="relative h-6 w-6 text-blue-400"
                aria-hidden
              />
            </div>
            <span className="text-[12px] font-black leading-relaxed uppercase tracking-[0.3em] text-slate-600">
              No Mission Telemetry Detected
            </span>
          </div>
          <p className="max-w-xs text-center text-[11px] font-bold uppercase tracking-widest text-slate-500">
            Authorize a Vanguard Scout mission to populate with findings
          </p>
        </div>
      )}
    </div>
  );
}
