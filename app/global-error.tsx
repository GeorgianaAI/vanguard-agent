"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 font-mono">
        <div className="flex flex-col items-center gap-4 p-8 border border-red-800/50 bg-slate-900 max-w-md w-full">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400">
            Critical System Fault
          </p>
          <p className="text-[10px] text-slate-400 text-center">
            An unrecoverable error occurred. The incident has been reported.
          </p>
          {error.digest && (
            <p className="text-[9px] text-slate-600">digest: {error.digest}</p>
          )}
          <button
            onClick={reset}
            className="text-[10px] font-bold uppercase tracking-wider px-4 py-2 border border-cyan-500/50 text-cyan-400 hover:bg-slate-800 transition-colors"
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
