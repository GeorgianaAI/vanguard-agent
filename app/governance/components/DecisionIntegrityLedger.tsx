 "use client";

import { useEffect, useMemo, useState } from "react";
import { Gavel } from "lucide-react";

import type { DashboardMessage } from "@/app/dashboard/lib/types";
import { THREAD_STORAGE_KEY } from "@/app/dashboard/lib/chatHelpers";

import { LEDGER_MOCK } from "../governance-mock-data";
import {
  buildGovernanceLedgerRowsFromMessages,
  type GovernanceLedgerRow,
} from "../lib/buildGovernanceLedgerRows";

export function DecisionIntegrityLedger() {
  const [ledgerRows, setLedgerRows] = useState<GovernanceLedgerRow[]>(
    () => [...LEDGER_MOCK] as unknown as GovernanceLedgerRow[],
  );

  const shouldFetchThreadHistory = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(THREAD_STORAGE_KEY) != null;
  }, []);

  useEffect(() => {
    if (!shouldFetchThreadHistory) return;

    const controller = new AbortController();

    void (async () => {
      try {
        const threadId = window.localStorage.getItem(THREAD_STORAGE_KEY);
        if (!threadId) return;

        const res = await fetch(
          `/api/chat/history?thread_id=${encodeURIComponent(threadId)}`,
          { signal: controller.signal, credentials: "include" },
        );
        if (!res.ok) return;

        const data = (await res.json()) as {
          messages?: DashboardMessage[];
        };
        const messages = data.messages ?? [];
        if (!messages.length) return;

        setLedgerRows(
          buildGovernanceLedgerRowsFromMessages(messages),
        );
      } catch {
        // Keep mock rows on any error.
      }
    })();

    return () => controller.abort();
  }, [shouldFetchThreadHistory]);

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
        <span
          data-testid="governance-ledger-live-badge"
          className="rounded border border-cyan-500/20 bg-cyan-950/40 px-2 py-1 text-[10px] font-bold text-cyan-400"
        >
          LIVE AUDIT ACTIVE
        </span>
      </div>

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
    </div>
  );
}
