"use client";

import { useState } from "react";
import { GameStageRouter } from "./features/gameplay/components/GameStageRouter";
import { LandingContent } from "./features/landing/components/LandingContent";
import { gameSchema } from "./features/landing/gameSchema";
import { LeaderboardModal } from "./features/leaderboard/components/LeaderboardModal";
import { LobbyActionButtons } from "./features/lobby/components/LobbyActionButtons";
import { LobbySetupForm } from "./features/lobby/components/LobbySetupForm";
import { useLobbyClient } from "./features/lobby/hooks/useLobbyClient";

export default function Home() {
  const {
    name,
    setName,
    lobbyId,
    setLobbyId,
    error,
    myPlayerId,
    lobby,
    isConnected,
    isHost,
    workerBaseUrl,
    leaderboardEligibility,
    leaderboardSubmitStatus,
    leaderboardSubmitError,
    createLobby,
    joinLobby,
    exitGame,
    startGame,
    onCardPlay,
    onShurikenUse,
    submitLeaderboardEntry,
  } = useLobbyClient();

  const isPlaying = lobby?.state === "playing";
  const hasJoinedLobby = Boolean(lobby);
  const [lobbyFlow, setLobbyFlow] = useState<"create" | "join">("create");
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const showLobbyControls = !isPlaying;
  const shouldRenderGameStage = Boolean(lobby);
  const mainClasses = isPlaying
    ? "mx-auto w-full max-w-4xl p-0"
    : "mx-auto w-full max-w-3xl rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)] p-6 shadow-[0_18px_80px_rgba(6,10,14,0.65)] backdrop-blur md:p-8";

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-8 text-stone-100 sm:px-6 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema) }}
      />
      <div aria-hidden="true" className="pointer-events-none absolute left-[-6rem] top-[-7rem] h-72 w-72 rounded-full bg-[#7ce4c014] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute right-[-8rem] top-24 h-96 w-96 rounded-full bg-[#6ac8e818] blur-3xl" />

      <button
        onClick={() => setIsLeaderboardOpen(true)}
        className="fixed right-4 top-4 z-40 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-1)] px-4 py-2 text-sm font-semibold text-[var(--text-strong)] shadow-lg backdrop-blur transition hover:border-[var(--accent)] hover:text-[var(--accent)] sm:right-6 sm:top-6"
      >
        🏆 Leaderboard
      </button>

      {isLeaderboardOpen ? (
        <LeaderboardModal
          workerBaseUrl={workerBaseUrl}
          onClose={() => setIsLeaderboardOpen(false)}
        />
      ) : null}

      <main className={mainClasses}>
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-4xl">
          The Mind
        </h1>
        by <i> Wolfgang Warsch </i>

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

        {!hasJoinedLobby ? <LandingContent /> : null}

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

            {error ? (<p className="mt-1 text-sm text-[#ff8f8f]">Error: {error}</p>) : null}
          </>
        ) : null}

        {shouldRenderGameStage && lobby ? (
          <>
            {!isConnected && (
              <p className="mt-4 text-xs tracking-[0.06em] text-[#f3cf96]">
                Connection lost. Reconnecting...
              </p>
            )}
            <GameStageRouter
              lobbyId={lobbyId}
              lobby={lobby}
              myPlayerId={myPlayerId}
              isHost={isHost}
              onStartGame={startGame}
              onExitGame={exitGame}
              onCardPlay={onCardPlay}
              onShurikenUse={onShurikenUse}
              leaderboardEligibility={leaderboardEligibility}
              leaderboardSubmitStatus={leaderboardSubmitStatus}
              leaderboardSubmitError={leaderboardSubmitError}
              onSubmitLeaderboardEntry={submitLeaderboardEntry}
            />
          </>
        ) : null}
      </main>
    </div>
  );
}
