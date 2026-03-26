import { Search } from "lucide-react";

type TargetInputProps = {
  target: string;
  setTarget: (value: string) => void;
};

export function TargetInput({ target, setTarget }: TargetInputProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <Search className="h-5 w-5 text-slate-500" />
      <input
        type="text"
        placeholder="Target IP or Domain (e.g., google.com)..."
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        className="flex-1 border-none bg-transparent text-cyan-50 outline-none placeholder:text-slate-600"
      />
    </div>
  );
}
