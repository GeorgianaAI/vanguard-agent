import Link from "next/link";
import { Satellite, Shield, Activity, Lock } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* --- Hero Section --- */}
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-20 text-center">
        {/* 🛰️ TECHNICAL CLASSIFICATION */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold tracking-widest uppercase mb-8">
          <Activity className="w-3 h-3 animate-pulse" />
          Agentic AI: Phase 2 Operational Autonomy
        </div>

        <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">
          VANGUARD AGENT <span className="text-cyan-500">🛰️</span>
        </h1>

        <p className="max-w-2xl mx-auto text-lg md:text-xl text-slate-400 leading-relaxed mb-10">
          An autonomous <strong>Security Reconnaissance Scout</strong>{" "}
          engineered for governed adversarial operations. Built with LangGraph,
          Claude 4.6, and Human-in-the-Loop authorization.
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

      {/* --- Technical Pillar Grid --- */}
      <section className="max-w-5xl mx-auto px-6 py-20 grid md:grid-cols-3 gap-8 border-t border-slate-900">
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
          <Lock className="w-8 h-8 text-cyan-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">Governed Autonomy</h3>
          <p className="text-sm text-slate-500">
            Implements a hard interrupt before tool execution. No reconnaissance
            is performed without explicit operator authorization.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
          <Activity className="w-8 h-8 text-cyan-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">Real-Time Recon</h3>
          <p className="text-sm text-slate-500">
            Utilizes Tavily AI and direct RDAP registry queries for deep-web
            intelligence and domain reconnaissance.
          </p>
        </div>
        <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800">
          <Shield className="w-8 h-8 text-cyan-500 mb-4" />
          <h3 className="font-bold text-lg mb-2">Mission Persistence</h3>
          <p className="text-sm text-slate-500">
            Stateful memory via Upstash Redis allows complex missions to pause
            and resume across sessions with full context retention.
          </p>
        </div>
      </section>
    </div>
  );
}
