interface NameStepProps {
  name: string;
  onNameChange: (value: string) => void;
  onContinue: () => void;
}

export function NameStep({ name, onNameChange, onContinue }: NameStepProps) {
  const canContinue = name.trim().length > 0;

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canContinue) onContinue();
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-[var(--text-muted)]">Name</span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoComplete="nickname"
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-3 text-base text-[var(--text-strong)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
        />
      </label>

      <button
        type="submit"
        disabled={!canContinue}
        className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 font-semibold text-[#0a1712] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:w-[min(100%,22rem)]"
      >
        Continue
      </button>
    </form>
  );
}
