import Link from "next/link";
import type { ReactNode } from "react";

type MissionNavButtonProps = {
  href: string;
  label: string;
  subtitle?: string;
  leftIcon: ReactNode;
  labelIcon?: ReactNode;
  dataTestId?: string;
  className?: string;
};

const baseClassName =
  "group inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 shadow-lg shadow-black/40 transition-all hover:border-cyan-500/50 hover:bg-slate-900 hover:text-cyan-400 focus:outline-none";

export function MissionNavButton({
  href,
  label,
  subtitle,
  leftIcon,
  labelIcon,
  dataTestId,
  className = "",
}: MissionNavButtonProps) {
  return (
    <Link href={href} data-testid={dataTestId} className={`${baseClassName} ${className}`.trim()}>
      {leftIcon}
      <span className="flex flex-col items-start gap-1 leading-none">
        <span className="flex items-center gap-1.5">
          {labelIcon ? labelIcon : null}
          {label}
        </span>
        {subtitle ? (
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
            {subtitle}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
