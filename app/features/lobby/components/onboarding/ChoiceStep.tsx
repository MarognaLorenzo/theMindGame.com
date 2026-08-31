import { Spinner } from "./Spinner";

interface ChoiceStepProps {
  name: string;
  isCreating: boolean;
  onCreate: () => void;
  onJoin: () => void;
  onBack: () => void;
}

export function ChoiceStep({ name, isCreating, onCreate, onJoin, onBack }: ChoiceStepProps) {
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
          disabled={isCreating}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-3 font-semibold text-[#0a1712] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isCreating ? (
            <>
              <Spinner className="h-4 w-4" />
              Creating lobby&hellip;
            </>
          ) : (
            "Create a lobby"
          )}
        </button>
        <button
          onClick={onJoin}
          disabled={isCreating}
          className="min-h-11 w-full rounded-xl border border-[var(--border-subtle)] px-4 py-3 font-semibold text-[var(--text-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Join with a code
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        disabled={isCreating}
        className="text-sm text-[var(--text-muted)] underline underline-offset-2 transition hover:text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
      >
        &lsaquo; Back
      </button>
    </div>
  );
}
