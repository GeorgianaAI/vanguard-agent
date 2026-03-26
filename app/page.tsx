import Link from "next/link";
import { ShieldCheck, Satellite } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-700 px-4 py-10 text-slate-100 sm:px-8">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 rounded-2xl border border-slate-500 bg-slate-800/70 p-8">
        <header className="flex items-center gap-3">
          <Satellite className="h-8 w-8 text-cyan-400" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              VANGUARD AGENT
            </h1>
            <p className="text-sm text-slate-200">
              Autonomous Security Scout for recon and audit missions.
            </p>
          </div>
        </header>

        <section className="rounded-xl border border-slate-500 bg-slate-700 p-6">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-300" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-100">
              Mission Control
            </h2>
          </div>

          <p className="mb-6 max-w-2xl text-slate-200">
            Launch reconnaissance workflows, inspect tool steps, and apply
            Human-in-the-Loop approvals from the dashboard.
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center rounded-md bg-cyan-600 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-cyan-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-700"
          >
            Open Dashboard
          </Link>
        </section>
      </main>
    </div>
  );
}
