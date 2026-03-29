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
    <form onSubmit={onSubmit} className="relative group">
      <div className="absolute -inset-0.5 bg-cyan-500/10 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

      <input
        data-testid="mission-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Initialize mission sequence..."
        className="relative w-full rounded-2xl border-2 border-slate-800 bg-slate-900 px-8 py-5 pr-36 text-base font-medium text-slate-100 outline-none transition-all focus:border-cyan-600/50 shadow-xl placeholder:text-slate-500"
      />

      <button
        type="submit"
        data-testid="deploy-button"
        disabled={loading}
        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-xl bg-cyan-600 px-8 py-2.5 text-[11px] font-black tracking-[0.2em] text-white transition-all hover:bg-cyan-500 disabled:opacity-50 uppercase shadow-lg shadow-cyan-500/20"
      >
        {loading ? "EXECUTING..." : "DEPLOY"}
      </button>
    </form>
  );
}
