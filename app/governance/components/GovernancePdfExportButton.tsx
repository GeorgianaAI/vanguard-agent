"use client";

import { Download, FileText } from "lucide-react";
import { useCallback, useState } from "react";

import { MissionActionButton } from "@/app/components/ui/MissionActionButton";
import { useGovernanceData } from "../hooks/useGovernanceData";

export function GovernancePdfExportButton() {
  const { threadId } = useGovernanceData();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onExport = useCallback(async () => {
    setErr(null);

    if (!threadId?.trim()) {
      setErr(
        "No Command session thread in storage — open the dashboard and run a chat first, then export.",
      );
      return;
    }

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
    <div className="flex flex-col items-start gap-1">
      <MissionActionButton
        dataTestId="governance-export-pdf"
        busy={busy}
        onClick={() => void onExport()}
        title={busy ? "Generating..." : "Generate NIST Audit Report"}
        subtitle="NIST-aligned PDF (ISO 27001)"
        className="hover:border-blue-500/50 hover:bg-slate-900 hover:text-blue-400"
        leftIcon={
          <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-colors group-hover:text-blue-500" />
        }
        rightIcon={
          <Download className="h-2.5 w-2.5 shrink-0 translate-y-0.5 opacity-40 transition-all group-hover:translate-y-0 group-hover:opacity-100" />
        }
      />
      {err ? (
        <p className="max-w-[14rem] text-[10px] text-rose-400">{err}</p>
      ) : null}
    </div>
  );
}
