import Link from "next/link";
import { ArrowLeft, Radar } from "lucide-react";

/** Global / segment 404: resource outside mission scope. */
export default function NotFoundPage() {
  return (
    <main
      data-testid="page-state-not-found"
      className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center"
    >
      <Radar className="mb-6 h-12 w-12 text-rose-500 opacity-50" />
      <h1 className="text-sm font-black uppercase tracking-[0.3em] text-white">
        Page Not Found
      </h1>
      <p className="mt-2 max-w-xs text-[10px] font-bold uppercase tracking-widest text-slate-500">
        The requested coordinate does not exist within the Vanguard Command
        architecture.
      </p>
      <Link
        href="/dashboard"
        className="group mt-10 flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:border-cyan-500/50 hover:text-cyan-400"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
        Return to Command Center
      </Link>
    </main>
  );
}
