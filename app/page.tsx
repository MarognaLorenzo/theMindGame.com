"use client";

import { useState } from "react";
import { GameStageRouter } from "./features/gameplay/components/GameStageRouter";
import { LandingContent } from "./features/landing/components/LandingContent";
import { gameSchema } from "./features/landing/gameSchema";
import { LeaderboardModal } from "./features/leaderboard/components/LeaderboardModal";
import { LobbyOnboarding } from "./features/lobby/components/onboarding/LobbyOnboarding";
import { useLobbyClient } from "./features/lobby/hooks/useLobbyClient";
import type { LobbyPhase } from "./features/lobby/hooks/useLobbyClient";

const ONBOARDING_SUBTITLE: Record<LobbyPhase, string> = {
  name: "Enter your name to get started.",
  choice: "You're all set — pick how you want to play.",
  code: "Enter the code a friend shared with you.",
  invite: "You've been invited to a lobby — just add your name.",
};

export default function Home() {
  const {
    name,
    setName,
    lobbyId,
    setLobbyId,
    phase,
    setPhase,
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
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  // Onboarding and the game stage are mutually exclusive: the moment a lobby exists we hand
  // the whole surface to GameStageRouter (waiting room, then play).
  const showOnboarding = !hasJoinedLobby;
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
        <h1 className="pr-28 text-3xl font-semibold tracking-tight text-[var(--text-strong)] sm:pr-0 sm:text-4xl">
          The Mind
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          by <span className="italic text-[var(--text-strong)]">Wolfgang Warsch</span>
        </p>

        {!hasJoinedLobby ? (
          <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-muted)]">
            The co-op card game where{" "}
            <span className="font-semibold text-[var(--text-strong)]">2&ndash;4 players</span>{" "}
            play their cards in ascending order &mdash; no talking, no signals,
            no showing numbers. Just timing and trust.
          </p>
        ) : null}

        {hasJoinedLobby && lobbyId ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Lobby code: {lobbyId}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          {isPlaying
            ? "Focus mode on. Play cards directly from your hand."
            : hasJoinedLobby
              ? "Share the lobby code and start once everyone has joined."
              : ONBOARDING_SUBTITLE[phase]}
        </p>

        {showOnboarding ? (
          <LobbyOnboarding
            phase={phase}
            name={name}
            lobbyId={lobbyId}
            error={error}
            onNameChange={setName}
            onLobbyIdChange={setLobbyId}
            onPhaseChange={setPhase}
            onCreateLobby={createLobby}
            onJoinLobby={joinLobby}
          />
        ) : null}

        {!hasJoinedLobby ? <LandingContent /> : null}

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
