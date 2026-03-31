import { Search, ShieldCheck, Cpu } from "lucide-react";

export type AgentType = "SUPERVISOR" | "SCOUT" | "AUDITOR";

type AgentBadgeProps = {
  type: AgentType;
};

export function AgentBadge({ type }: AgentBadgeProps) {
  const configs = {
    SUPERVISOR: {
      color: "text-amber-400 border-amber-900/30 bg-amber-950/20",
      icon: <Cpu className="h-3 w-3" />,
      label: "SUPERVISOR",
    },
    SCOUT: {
      color: "text-cyan-400 border-cyan-900/30 bg-cyan-950/20",
      icon: <Search className="h-3 w-3" />,
      label: "VANGUARD SCOUT",
    },
    AUDITOR: {
      color: "text-indigo-400 border-indigo-900/30 bg-indigo-950/20",
      icon: <ShieldCheck className="h-3 w-3" />,
      label: "VANGUARD AUDITOR",
    },
  } as const;

  const { color, icon, label } = configs[type];

  return (
    <div
      className={`flex w-fit items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-black tracking-widest uppercase ${color}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
