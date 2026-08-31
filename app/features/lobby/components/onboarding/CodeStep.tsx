import { Spinner } from "./Spinner";

interface CodeStepProps {
  lobbyId: string;
  isJoining: boolean;
  onLobbyIdChange: (value: string) => void;
  onJoin: () => void;
  onBack: () => void;
}

export function CodeStep({ lobbyId, isJoining, onLobbyIdChange, onJoin, onBack }: CodeStepProps) {
  const canJoin = lobbyId.trim().length > 0 && !isJoining;

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canJoin) onJoin();
      }}
    >
      <label className="block">
        <span className="mb-1 block text-sm text-[var(--text-muted)]">Lobby Code</span>
        <input
          value={lobbyId}
          onChange={(e) => onLobbyIdChange(e.target.value)}
          placeholder="Type or paste lobby code"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          disabled={isJoining}
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-3 font-mono text-base text-[var(--text-strong)] outline-none transition placeholder:font-sans placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] disabled:opacity-60"
        />
      </label>

      <button
        type="submit"
        disabled={!canJoin}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 font-semibold text-[#0a1712] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40 sm:w-[min(100%,22rem)]"
      >
        {isJoining ? (
          <>
            <Spinner className="h-4 w-4" />
            Joining&hellip;
          </>
        ) : (
          "Join lobby"
        )}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={isJoining}
        className="block text-sm text-[var(--text-muted)] underline underline-offset-2 transition hover:text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
      >
        &lsaquo; Back
      </button>
    </form>
  );
}
