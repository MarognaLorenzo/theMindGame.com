interface ChoiceStepProps {
  name: string;
  onCreate: () => void;
  onJoin: () => void;
  onBack: () => void;
}

export function ChoiceStep({ name, onCreate, onJoin, onBack }: ChoiceStepProps) {
  return (
    <div className="mt-8 space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Hi{" "}
        <span className="font-semibold text-[var(--text-strong)]">{name.trim()}</span>
        {" "}&mdash; what next?
      </p>

      <div className="space-y-3">
        <button
          onClick={onCreate}
          className="min-h-11 w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[#0a1712] transition hover:brightness-110"
        >
          Create a lobby
        </button>
        <button
          onClick={onJoin}
          className="min-h-11 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 font-semibold text-[var(--text-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Join with a code
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="text-sm text-[var(--text-muted)] underline underline-offset-2 transition hover:text-[var(--text-strong)]"
      >
        &lsaquo; Back
      </button>
    </div>
  );
}
