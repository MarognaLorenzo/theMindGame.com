import { Spinner } from "./Spinner";

interface InviteStepProps {
  name: string;
  lobbyId: string;
  isJoining: boolean;
  onNameChange: (value: string) => void;
  onJoin: () => void;
  onUseDifferentLobby: () => void;
}

export function InviteStep({
  name,
  lobbyId,
  isJoining,
  onNameChange,
  onJoin,
  onUseDifferentLobby,
}: InviteStepProps) {
  const canJoin = name.trim().length > 0 && !isJoining;

  return (
    <form
      className="mt-8 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canJoin) onJoin();
      }}
    >
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
          You&rsquo;re joining
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-[0.18em] text-[var(--text-strong)]">
          {lobbyId}
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm text-[var(--text-muted)]">Name</span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          autoComplete="nickname"
          disabled={isJoining}
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-3 text-base text-[var(--text-strong)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] disabled:opacity-60"
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
        onClick={onUseDifferentLobby}
        disabled={isJoining}
        className="block text-sm text-[var(--text-muted)] underline underline-offset-2 transition hover:text-[var(--text-strong)] disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
      >
        Join a different lobby
      </button>
    </form>
  );
}
