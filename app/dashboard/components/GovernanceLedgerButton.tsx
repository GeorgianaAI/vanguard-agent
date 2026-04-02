import Link from "next/link";
import { Scale } from "lucide-react";

export function GovernanceLedgerButton() {
  return (
    <Link
      href="/governance"
      className="group flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[10px] font-bold tracking-wider uppercase text-slate-400 transition-all hover:border-indigo-500/50 hover:bg-slate-900 hover:text-indigo-300 shadow-lg shadow-black/40 focus:outline-none"
    >
      <Scale className="h-3 w-3 text-indigo-400/80 transition-colors group-hover:text-indigo-300" />

      <span className="flex flex-col items-start gap-1 leading-none">
        <span className="flex items-center gap-1.5">Governance Ledger</span>
        <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
          NIST oversight view
        </span>
      </span>
    </Link>
  );
}
