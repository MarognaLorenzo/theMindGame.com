"use client";

import Link from "next/link";
import { useState } from "react";
import { GameStageRouter } from "./features/gameplay/components/GameStageRouter";
import { LobbyActionButtons } from "./features/lobby/components/LobbyActionButtons";
import { LobbySetupForm } from "./features/lobby/components/LobbySetupForm";
import { LobbyStatusBar } from "./features/lobby/components/LobbyStatusBar";
import { useLobbyClient } from "./features/lobby/hooks/useLobbyClient";

const gameSchema = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "The Mind Online",
  url: "https://the-mind-game.com",
  description:
    "Play The Mind online in your browser with a focused multiplayer lobby experience.",
  genre: ["Card Game", "Cooperative Game", "Multiplayer"],
  playMode: "MultiPlayer",
  applicationCategory: "Game",
  inLanguage: "en",
  author: {
    "@type": "Person",
    name: "Wolfgang Warsch",
  },
  publisher: {
    "@type": "Organization",
    name: "The Mind Online",
  },
};

function LandingIllustration() {
  return (
    <section className="relative mt-6 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[linear-gradient(160deg,#112033_0%,#132535_45%,#192d2f_100%)] p-5 shadow-[0_12px_40px_rgba(2,6,10,0.45)] sm:p-6">
      <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-[#9be8ff1f] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-10 left-8 h-36 w-36 rounded-full bg-[#7ce4c029] blur-2xl" />

      <div className="relative z-10 grid gap-5 md:grid-cols-[1.1fr_1fr] md:items-center">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-muted)]">
            Silent Cooperative Card Game
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-strong)] sm:text-3xl">
            Read The Table, Not The Numbers.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--text-muted)] sm:text-[0.95rem]">
            No voice calls, no value hints. Only timing, trust, and team rhythm. Create a lobby and discover whether your group can stay in sync.
          </p>
        </div>

        <div className="rounded-xl border border-[#bad8d53a] bg-[#08131dcc] p-3">
          <svg viewBox="0 0 420 240" role="img" aria-label="Stylized illustration of cards being played in sequence" className="h-auto w-full">
            <defs>
              <linearGradient id="tableGlow" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#53a7c2" stopOpacity="0.36" />
                <stop offset="100%" stopColor="#7ce4c0" stopOpacity="0.1" />
              </linearGradient>
              <linearGradient id="cardSurface" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fffef8" />
                <stop offset="100%" stopColor="#eee4cf" />
              </linearGradient>
            </defs>

            <ellipse cx="210" cy="170" rx="180" ry="45" fill="url(#tableGlow)" />

            <g>
              <rect x="60" y="56" width="84" height="124" rx="14" fill="url(#cardSurface)" transform="rotate(-11 102 118)" />
              <text x="102" y="126" textAnchor="middle" fill="#24313a" fontSize="34" fontWeight="700" transform="rotate(-11 102 118)">
                9
              </text>
            </g>

            <g>
              <rect x="164" y="42" width="92" height="132" rx="14" fill="url(#cardSurface)" />
              <text x="210" y="116" textAnchor="middle" fill="#24313a" fontSize="37" fontWeight="700">
                24
              </text>
            </g>

            <g>
              <rect x="278" y="56" width="84" height="124" rx="14" fill="url(#cardSurface)" transform="rotate(10 320 118)" />
              <text x="320" y="126" textAnchor="middle" fill="#24313a" fontSize="34" fontWeight="700" transform="rotate(10 320 118)">
                36
              </text>
            </g>

            <path d="M96 198 C144 176, 170 182, 210 160 C246 140, 270 152, 318 132" fill="none" stroke="#9be8d6" strokeWidth="3" strokeDasharray="6 7" strokeLinecap="round" />

            <circle cx="96" cy="198" r="5" fill="#9be8d6">
              <animate attributeName="r" values="5;7;5" dur="1.6s" repeatCount="indefinite" />
            </circle>
            <circle cx="210" cy="160" r="5" fill="#9be8d6">
              <animate attributeName="r" values="5;7;5" dur="1.6s" begin="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="318" cy="132" r="5" fill="#9be8d6">
              <animate attributeName="r" values="5;7;5" dur="1.6s" begin="0.8s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>
      </div>
    </section>
  );
}

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
  const hasJoinedLobby = Boolean(lobby);
  const [lobbyFlow, setLobbyFlow] = useState<"create" | "join">("create");
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

        {!hasJoinedLobby ? (
          <div className="mt-3 text-sm text-[var(--text-muted)]">
            Learn the game flow on the {" "}
            <Link
              href="/rules"
              className="text-[var(--text-strong)] underline decoration-[#8fd8d7] underline-offset-2"
            >
              rules page
            </Link>
            .
          </div>
        ) : null}

        {!hasJoinedLobby ? <LandingIllustration /> : null}

        {!hasJoinedLobby ? (
          <section className="mt-8 grid gap-4 text-sm text-[var(--text-muted)] sm:grid-cols-2">
            <article className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
              <h2 className="text-base font-semibold text-[var(--text-strong)]">
                How To Play Online
              </h2>
              <p className="mt-2 leading-relaxed">
                Create a lobby, share the code, and start when everyone joins. Your team must play cards in ascending order without revealing values.
              </p>
            </article>
            <article className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-4">
              <h2 className="text-base font-semibold text-[var(--text-strong)]">
                Rules Summary
              </h2>
              <p className="mt-2 leading-relaxed">
                Wrong timing costs shared lives. Shurikens help clear low cards in difficult rounds. Win by clearing all levels together.
              </p>
            </article>
          </section>
        ) : null}

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
            />
          </>
        ) : null}
      </main>
    </div>
  );
}
