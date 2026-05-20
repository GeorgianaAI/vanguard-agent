import Link from "next/link";
import { Satellite, Radar, Shield, Activity, UserCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-slate-100 font-sans selection:bg-cyan-500/30"
      style={{ background: "radial-gradient(ellipse 90% 60% at 50% -5%, rgba(6,182,212,0.25) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 0% 100%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(99,102,241,0.08) 0%, transparent 60%), #020617" }}
    >
      {/* --- Hero Section --- */}
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-8">
          <Activity className="w-3 h-3 animate-pulse" />
          Agentic AI: Phase 2 Operational Autonomy
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 bg-linear-to-b from-white to-slate-500 bg-clip-text text-transparent flex items-center justify-center gap-4">
          VANGUARD AGENT
          <Satellite className="w-16 h-16 md:w-20 md:h-20 text-cyan-400 shrink-0" />
        </h1>

        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed mb-10">
          An autonomous <strong>Security Reconnaissance Scout</strong> engineered for governed
          adversarial operations. Built with LangGraph, Claude Sonnet 4.6, and Human-in-the-Loop
          authorization.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2 group"
          >
            LAUNCH COMMAND CENTER{" "}
            <Satellite className="w-5 h-5 group-hover:rotate-12 transition-transform" />
          </Link>
          <Link
            href="https://github.com/GeorgiDS9/vanguard-agent"
            className="px-8 py-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded-xl transition-all"
          >
            VIEW ARCHITECTURE
          </Link>
        </div>
      </main>

      {/* --- Status Footer --- */}
      <footer className="fixed bottom-8 inset-x-0 flex justify-center pointer-events-none">
        <div className="flex items-center gap-8 font-mono text-[11px] uppercase tracking-widest">
          <span className="text-slate-500">Engine: <span className="text-cyan-400 font-bold">v1.0</span></span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500">Nodes: <span className="text-cyan-400 font-bold">03</span></span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500">Models: <span className="text-cyan-400 font-bold">03</span></span>
        </div>
      </footer>

      {/* --- Technical Pillar Grid --- */}
      <section className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-8 border-t border-slate-900">
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
          <UserCheck className="w-8 h-8 text-cyan-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">Governed Autonomy</h3>
          <p className="text-sm text-slate-500">
            Every tool call triggers a Human-in-the-Loop (HITL) checkpoint — execution pauses
            until the operator explicitly authorizes the action. Zero autonomous network activity.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
          <Radar className="w-8 h-8 text-cyan-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">Real-Time Recon</h3>
          <p className="text-sm text-slate-500">
            Utilizes Tavily AI and direct RDAP registry queries for public-source intelligence and
            domain reconnaissance.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
          <Shield className="w-8 h-8 text-cyan-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">Mission Persistence</h3>
          <p className="text-sm text-slate-500">
            Stateful memory via Upstash Redis allows complex missions to pause and resume across
            sessions with full context retention.
          </p>
        </div>
      </section>
    </div>
  );
}
