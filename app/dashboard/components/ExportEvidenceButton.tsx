import { Download, FileJson } from "lucide-react";

type ExportEvidenceButtonProps = {
  onExport: () => void;
};

export function ExportEvidenceButton({ onExport }: ExportEvidenceButtonProps) {
  return (
    <button
      type="button"
      onClick={onExport}
      className="group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 transition-all hover:border-amber-500/50 hover:bg-amber-900/20 hover:text-amber-400 shadow-lg shadow-black/40 focus:outline-none"
    >
      <FileJson className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-colors group-hover:text-amber-500" />

      <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 group-hover:text-amber-400">
        Export Evidence (JSON)
      </span>

      <Download className="h-2.5 w-2.5 shrink-0 translate-y-0.5 opacity-40 transition-all group-hover:translate-y-0 group-hover:opacity-100" />
    </button>
  );
}
