import type { LobbyActionPending, LobbyPhase } from "../../hooks/useLobbyClient";
import { ChoiceStep } from "./ChoiceStep";
import { CodeStep } from "./CodeStep";
import { InviteStep } from "./InviteStep";
import { NameStep } from "./NameStep";

interface LobbyOnboardingProps {
  phase: LobbyPhase;
  name: string;
  lobbyId: string;
  error: string;
  pending: LobbyActionPending;
  onNameChange: (value: string) => void;
  onLobbyIdChange: (value: string) => void;
  onPhaseChange: (phase: LobbyPhase) => void;
  onCreateLobby: () => void;
  onJoinLobby: () => void;
}

// The pre-lobby step machine. One screen per decision: the player names themselves, then
// picks create vs. join, rather than facing every field and both actions at once. An
// invite link (`?lobby=CODE`) skips straight to the `invite` step — the room is known, so
// all that is missing is the name.
export function LobbyOnboarding({
  phase,
  name,
  lobbyId,
  error,
  pending,
  onNameChange,
  onLobbyIdChange,
  onPhaseChange,
  onCreateLobby,
  onJoinLobby,
}: LobbyOnboardingProps) {
  const isCreating = pending === "creating";
  const isJoining = pending === "joining";

  return (
    <>
      {phase === "name" ? (
        <NameStep
          name={name}
          onNameChange={onNameChange}
          onContinue={() => onPhaseChange("choice")}
        />
      ) : null}

      {phase === "choice" ? (
        <ChoiceStep
          name={name}
          isCreating={isCreating}
          onCreate={onCreateLobby}
          onJoin={() => onPhaseChange("code")}
          onBack={() => onPhaseChange("name")}
        />
      ) : null}

      {phase === "code" ? (
        <CodeStep
          lobbyId={lobbyId}
          isJoining={isJoining}
          onLobbyIdChange={onLobbyIdChange}
          onJoin={onJoinLobby}
          onBack={() => onPhaseChange("choice")}
        />
      ) : null}

      {phase === "invite" ? (
        <InviteStep
          name={name}
          lobbyId={lobbyId}
          isJoining={isJoining}
          onNameChange={onNameChange}
          onJoin={onJoinLobby}
          onUseDifferentLobby={() => onPhaseChange("name")}
        />
      ) : null}

      {error ? <p className="mt-3 text-sm text-[#ff8f8f]">Error: {error}</p> : null}
    </>
  );
}
