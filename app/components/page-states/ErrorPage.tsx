"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, ShieldAlert } from "lucide-react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/** App Router `error.tsx` shell: critical failure + recovery controls. */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[page-state-error]", error);
  }, [error]);

  return (
    <main
      data-testid="page-state-error"
      className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-center"
    >
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-rose-900/30 bg-rose-950/20">
        <ShieldAlert className="h-7 w-7 text-rose-500" />
      </div>
      <h1 className="text-sm font-black uppercase tracking-[0.3em] text-rose-500">
        Error Occurred
      </h1>
      <p className="mt-2 max-w-xs text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Please try again.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-[9px] text-slate-600">
          Ref: {error.digest}
        </p>
      ) : null}
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-lg bg-rose-600 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-rose-900/20 transition-all hover:bg-rose-500 active:scale-95"
        >
          <RotateCcw className="h-3 w-3" />
          Refresh Page
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all hover:border-cyan-500/50 hover:text-cyan-400"
        >
          Command Center
        </Link>
      </div>
    </main>
  );
}
