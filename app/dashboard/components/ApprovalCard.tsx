import { ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { APPROVAL_TITLE } from "../lib/constants";
import type { ToolActionHandler, ToolPart } from "../lib/types";

type ApprovalCardProps = {
  part: ToolPart;
  onAuthorize: ToolActionHandler;
  onAbort: ToolActionHandler;
};

export function ApprovalCard({
  part,
  onAuthorize,
  onAbort,
}: ApprovalCardProps) {
  return (
    <div className="my-6 rounded-2xl border border-amber-900/40 bg-amber-950/10 p-6 shadow-xl ring-1 ring-inset ring-amber-500/10">
      <div className="mb-4 flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500">
          {APPROVAL_TITLE}
        </div>
      </div>

      <p className="mb-6 text-[11px] leading-relaxed tracking-tight text-slate-400 uppercase font-medium">
        Vanguard is requesting external tool execution. Verify mission
        parameters before manual authorization.
      </p>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => onAuthorize(part)}
          className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Authorize Mission
        </button>
        <button
          type="button"
          onClick={() => onAbort(part)}
          className="flex-1 rounded-xl bg-slate-800 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:bg-slate-700 flex items-center justify-center gap-2"
        >
          <XCircle className="h-3.5 w-3.5" /> Abort Action
        </button>
      </div>
    </div>
  );
}
