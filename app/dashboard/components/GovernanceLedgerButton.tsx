import Link from "next/link";
import { Scale } from "lucide-react";

export function GovernanceLedgerButton() {
  return (
    <Link
      href="/governance"
      className="group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 shadow-lg shadow-black/40 transition-all hover:border-blue-500/50 hover:bg-slate-900 hover:text-blue-400 focus:outline-none"
    >
      <Scale className="h-3.5 w-3.5 shrink-0 opacity-40 transition-all group-hover:opacity-100 group-hover:text-blue-500" />
      <div className="flex flex-col items-start gap-1 leading-none">
        <span className="text-[10px] font-black uppercase tracking-widest">
          Governance Ledger
        </span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
          NIST Compliance View
        </span>
      </div>
    </Link>
  );
}
