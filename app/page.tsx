"use client";

import { GameStageRouter } from "./features/gameplay/components/GameStageRouter";
import { LobbyActionButtons } from "./features/lobby/components/LobbyActionButtons";
import { LobbySetupForm } from "./features/lobby/components/LobbySetupForm";
import { LobbyStatusBar } from "./features/lobby/components/LobbyStatusBar";
import { MessageLog } from "./features/lobby/components/MessageLog";
import { useLobbyClient } from "./features/lobby/hooks/useLobbyClient";

export default function Home() {
  const {
    name,
    setName,
    lobbyId,
    setLobbyId,
    status,
    error,
    messages,
    myPlayerId,
    lobby,
    isConnected,
    isHost,
    workerBaseUrl,
    createLobby,
    joinLobby,
    disconnectSocket,
    startGame,
    clearMessages,
    onCardPlay,
  } = useLobbyClient();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/20 to-slate-900 px-6 py-12 text-slate-100">
      <main className="mx-auto w-full max-w-2xl rounded-2xl border border-cyan-300/20 bg-slate-900/80 p-8 shadow-2xl shadow-cyan-950/50 backdrop-blur">
        <h1 className="text-3xl font-bold tracking-tight text-cyan-300">
          The Mind Lobby
        </h1>
        <p className="mt-2 text-sm text-slate-300">
          Enter your name, create a lobby, or join an existing one.
        </p>

        <LobbySetupForm
          name={name}
          lobbyId={lobbyId}
          onNameChange={setName}
          onLobbyIdChange={setLobbyId}
        />

        <LobbyActionButtons
          onCreateLobby={createLobby}
          onJoinLobby={joinLobby}
          onDisconnect={disconnectSocket}
        />

        <LobbyStatusBar
          status={status}
          error={error}
          workerBaseUrl={workerBaseUrl}
        />

        {isConnected ? (
          lobby ? (
            <GameStageRouter
              lobbyId={lobbyId}
              lobby={lobby}
              myPlayerId={myPlayerId}
              isHost={isHost}
              onStartGame={startGame}
              onCardPlay={onCardPlay}
            />
          ) : null
        ) : null}

        <MessageLog messages={messages} onClear={clearMessages} />
      </main>
    </div>
  );
}
