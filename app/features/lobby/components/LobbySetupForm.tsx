interface LobbySetupFormProps {
  name: string;
  lobbyId: string;
  onNameChange: (value: string) => void;
  onLobbyIdChange: (value: string) => void;
}

export function LobbySetupForm({
  name,
  lobbyId,
  onNameChange,
  onLobbyIdChange,
}: LobbySetupFormProps) {
  return (
    <div className="mt-8 space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Name</span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="e.g. Lorenzo"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-cyan-400 transition focus:ring-2"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-slate-300">Lobby ID</span>
        <input
          value={lobbyId}
          onChange={(e) => onLobbyIdChange(e.target.value)}
          placeholder="Paste lobby ID to join"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none ring-cyan-400 transition focus:ring-2"
        />
      </label>
    </div>
  );
}
