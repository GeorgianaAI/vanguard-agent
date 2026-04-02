import { Search } from "lucide-react";

type TargetInputProps = {
  target: string;
  setTarget: (value: string) => void;
  error?: string | null;
  onBlur?: () => void;
};

export function TargetInput({
  target,
  setTarget,
  error = null,
  onBlur,
}: TargetInputProps) {
  return (
    <div>
      <div
        className={`flex items-center gap-4 rounded-2xl border bg-slate-900/50 p-6 shadow-lg shadow-black/20 ${
          error ? "border-rose-700/70" : "border-slate-800"
        }`}
      >
        <Search className="h-5 w-5 text-slate-500" />
        <input
          type="text"
          data-testid="target-input"
          placeholder="Target Coordinates: e.g. vanguard-security.com"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onBlur={onBlur}
          className="flex-1 border-none bg-transparent text-base font-medium text-slate-100 outline-none placeholder:text-slate-500"
        />
      </div>
      {error ? (
        <p className="mt-2 px-1 text-xs text-rose-400">{error}</p>
      ) : null}
    </div>
  );
}
