type CommandInputProps = {
  input: string;
  loading: boolean;
  setInput: (value: string) => void;
  onSubmit: (event: React.SyntheticEvent<HTMLFormElement>) => Promise<void>;
};

export function CommandInput({
  input,
  loading,
  setInput,
  onSubmit,
}: CommandInputProps) {
  return (
    <form onSubmit={onSubmit} className="relative">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter mission instructions..."
        className="w-full rounded-xl border-2 border-slate-800 bg-slate-900 px-6 py-4 pr-24 text-slate-400 outline-none transition-all focus:border-cyan-500/50"
      />
      <button
        type="submit"
        disabled={loading}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-cyan-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
      >
        {loading ? "EXECUTING..." : "SEND"}
      </button>
    </form>
  );
}
