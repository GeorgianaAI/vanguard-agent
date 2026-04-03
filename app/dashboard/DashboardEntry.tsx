"use client";

import dynamic from "next/dynamic";
import { Satellite } from "lucide-react";

function DashboardLoadingShell() {
  return (
    <main
      data-testid="page-state-loading"
      className="flex min-h-screen items-center justify-center bg-slate-950 p-6"
    >
      <div className="flex flex-col items-center">
        <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-full bg-cyan-500/20 opacity-75" />
          <Satellite className="relative h-8 w-8 text-cyan-500" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-[10px] font-black uppercase tracking-[0.4em] text-cyan-500">
            Loading Content
          </h1>
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-600">
            Fetching Mission Telemetry...
          </p>
        </div>
      </div>
    </main>
  );
}

const DashboardClient = dynamic(() => import("./DashboardClient"), {
  ssr: false,
  loading: () => <DashboardLoadingShell />,
});

/**
 * AI SDK / Vercel OIDC in DashboardClient throws during SSR when OIDC headers are absent (CI, local start).
 * Load the full dashboard only in the browser.
 */
export function DashboardEntry() {
  return <DashboardClient />;
}
