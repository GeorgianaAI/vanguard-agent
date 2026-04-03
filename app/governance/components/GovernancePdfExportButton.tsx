"use client";

import { FileDown } from "lucide-react";
import { useCallback, useState } from "react";

import { useGovernanceData } from "../hooks/useGovernanceData";

export function GovernancePdfExportButton() {
  const { threadId } = useGovernanceData();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onExport = useCallback(async () => {
    if (!threadId) return;
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(
        `/api/governance/export/pdf?thread_id=${encodeURIComponent(threadId)}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vanguard-governance-${threadId.slice(-12)}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }, [threadId]);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        data-testid="governance-export-pdf"
        disabled={!threadId || busy}
        onClick={() => void onExport()}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-[11px] font-black uppercase tracking-wider text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <FileDown className="h-4 w-4 shrink-0" />
        {busy ? "Exporting…" : "Export PDF"}
      </button>
      {err ? (
        <p className="max-w-[14rem] text-right text-[10px] text-rose-400">{err}</p>
      ) : null}
    </div>
  );
}
