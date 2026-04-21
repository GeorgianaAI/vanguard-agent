"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, User, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  async function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        setErr("INVALID OPERATOR CREDENTIALS");
        return;
      }

      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-700">
        <form
          onSubmit={onSubmit}
          className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 p-10 shadow-2xl shadow-black/60 backdrop-blur-xl"
        >
          {/* 💎 Optical Detail: Subtle top glow */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

          <div className="mb-10 flex flex-col items-center">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 shadow-inner">
              <Shield className="h-7 w-7 text-cyan-500" />
            </div>
            {/* 🛰️ FONT SCALE: Increased from text-xs to text-sm */}
            <h1 className="text-sm font-black tracking-[0.3em] uppercase text-white">
              Operator Authentication
            </h1>
            <p className="mt-2 text-[12px] font-bold tracking-widest text-slate-500 uppercase">
              Vanguard Command Center 🛰️
            </p>
          </div>

          <div className="space-y-5">
            {/* 👤 OPERATOR ID */}
            <div className="relative group">
              <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-cyan-500" />
              <input
                className="w-full rounded-lg border border-slate-800 bg-slate-950/50 py-4 pl-12 pr-4 text-[13px] font-bold tracking-wider text-slate-200 transition-all placeholder:text-slate-700 focus:border-cyan-500/40 focus:outline-none"
                placeholder="OPERATOR ID"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>

            {/* 🔑 ACCESS KEY (With restored eye-toggle) */}
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-cyan-500" />
              <input
                className="w-full rounded-lg border border-slate-800 bg-slate-950/50 py-4 pl-12 pr-14 text-[13px] font-bold tracking-wider text-slate-200 transition-all placeholder:text-slate-700 focus:border-cyan-500/40 focus:outline-none"
                placeholder="ACCESS KEY"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-cyan-500 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {err && (
              <div className="flex items-center gap-2 rounded border border-rose-900/30 bg-rose-950/20 px-4 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
                <p className="text-[11px] font-black tracking-widest text-rose-400 uppercase">
                  {err}
                </p>
              </div>
            )}

            {/* 🚀 INITIALIZE SESSION */}
            <button
              disabled={loading}
              className="group relative w-full overflow-hidden rounded-lg bg-cyan-600 py-4 text-[12px] font-black tracking-[0.2em] uppercase text-white shadow-lg shadow-cyan-900/20 transition-all hover:bg-cyan-500 active:scale-[0.98] disabled:opacity-50"
              type="submit"
            >
              {loading ? "AUTHENTICATING..." : "Initialize Session"}
            </button>
          </div>
        </form>

        <p className="mt-8 text-center text-[11px] font-bold tracking-widest text-slate-600 uppercase">
          SECURED VIA VANGUARD PROTOCOL 🛡️
        </p>
      </div>
    </main>
  );
}
