import Link from "next/link";
import type { ReactNode } from "react";

type MissionActionButtonProps = {
  title: string;
  subtitle?: string;
  leftIcon: ReactNode;
  rightIcon?: ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
  dataTestId?: string;
};

const baseClassName =
  "group flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-slate-400 shadow-lg shadow-black/40 transition-all focus:outline-none";
const disabledClassName =
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-slate-800 disabled:hover:bg-slate-950/40 disabled:hover:text-slate-400";

export function MissionActionButton({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onClick,
  href,
  disabled = false,
  busy = false,
  className = "",
  dataTestId,
}: MissionActionButtonProps) {
  const content = (
    <>
      {leftIcon}
      <div className="flex min-w-0 flex-col items-start gap-1 leading-none">
        <span className="text-[10px] font-black uppercase tracking-widest">
          {title}
        </span>
        {subtitle ? (
          <span className="text-[8px] font-bold uppercase tracking-widest text-slate-500">
            {subtitle}
          </span>
        ) : null}
      </div>
      {rightIcon ? rightIcon : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        data-testid={dataTestId}
        className={`${baseClassName} ${className}`.trim()}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      data-testid={dataTestId}
      className={`${baseClassName} ${disabledClassName} ${className}`.trim()}
    >
      {content}
    </button>
  );
}
