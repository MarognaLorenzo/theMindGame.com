interface LobbySetupFormProps {
  name: string;
  lobbyId: string;
  showLobbyIdField: boolean;
  onNameChange: (value: string) => void;
  onLobbyIdChange: (value: string) => void;
}

export function LobbySetupForm({
  name,
  lobbyId,
  showLobbyIdField,
  onNameChange,
  onLobbyIdChange,
}: LobbySetupFormProps) {
  return (
    <div className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-[var(--text-muted)]">Name</span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          // placeholder="e.g. Lorenzo"
          autoComplete="nickname"
          className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-3 text-base text-[var(--text-strong)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
        />
      </label>

      {showLobbyIdField ? (
        <label className="block">
          <span className="mb-1 block text-sm text-[var(--text-muted)]">Lobby Code</span>
          <input
            value={lobbyId}
            onChange={(e) => onLobbyIdChange(e.target.value)}
            placeholder="Type or paste lobby code"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-3 font-mono text-base text-[var(--text-strong)] outline-none transition placeholder:font-sans placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]"
          />
        </label>
      ) : null}
    </div>
  );
}
