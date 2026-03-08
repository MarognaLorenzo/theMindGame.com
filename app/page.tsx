"use client";

import { useState } from "react";
import { GameStageRouter } from "./features/gameplay/components/GameStageRouter";
import { LobbyActionButtons } from "./features/lobby/components/LobbyActionButtons";
import { LobbySetupForm } from "./features/lobby/components/LobbySetupForm";
import { LobbyStatusBar } from "./features/lobby/components/LobbyStatusBar";
import { useLobbyClient } from "./features/lobby/hooks/useLobbyClient";

export default function Home() {
  const {
    name,
    setName,
    lobbyId,
    setLobbyId,
    status,
    error,
    myPlayerId,
    lobby,
    isConnected,
    isHost,
    workerBaseUrl,
    createLobby,
    joinLobby,
    exitGame,
    startGame,
    onCardPlay,
    onShurikenUse,
  } = useLobbyClient();

  const isPlaying = lobby?.state === "playing";
  const [lobbyFlow, setLobbyFlow] = useState<"create" | "join">("create");
  const showLobbyControls = !isPlaying;
  const mainClasses = isPlaying
    ? "mx-auto w-full max-w-4xl p-0"
    : "mx-auto w-full max-w-3xl rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 shadow-[0_18px_80px_rgba(6,10,14,0.65)] backdrop-blur md:p-8";

  return (
    <div className="min-h-screen px-4 py-8 text-stone-100 sm:px-6 sm:py-12">
      <main className={mainClasses}>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-4xl">
          The Mind Online
        </h1>

        {lobbyId ? 
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          Lobby code: {lobbyId}
        </p>
        : null}
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {isPlaying
            ? "Focus mode on. Play cards directly from your hand."
            : "Enter your name, create a lobby, or join an existing one."}
        </p>

        {showLobbyControls ? (
          <>
            <LobbySetupForm
              name={name}
              lobbyId={lobbyId}
              showLobbyIdField={lobbyFlow === "join"}
              onNameChange={setName}
              onLobbyIdChange={setLobbyId}
            />

            <LobbyActionButtons
              flow={lobbyFlow}
              onFlowChange={setLobbyFlow}
              onCreateLobby={createLobby}
              onJoinLobby={joinLobby}
            />

            <LobbyStatusBar
              status={status}
              error={error}
              workerBaseUrl={workerBaseUrl}
            />
            {error ? (<p className="mt-1 text-sm text-[#ff8f8f]">Error: {error}</p>) : null}
          </>
        ) : null}

        {isConnected ? (
          lobby ? (
            <GameStageRouter
              lobbyId={lobbyId}
              lobby={lobby}
              myPlayerId={myPlayerId}
              isHost={isHost}
              onStartGame={startGame}
              onExitGame={exitGame}
              onCardPlay={onCardPlay}
              onShurikenUse={onShurikenUse}
            />
          ) : null
        ) : null}
      </main>
    </div>
  );
}
