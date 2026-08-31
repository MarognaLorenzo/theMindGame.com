import type { SocketLobbyState } from "../../lobby/types";
import { useLifeShurikenAnnouncements } from "../hooks/useLifeShurikenAnnouncements";
import { DiscardPile } from "./DiscardPile";
import { GameTable } from "./GameTable";
import { HeartIcon, ShurikenIcon } from "./icons";
import { LevelCompleteOverlay } from "./LevelCompleteOverlay";
import { LifeLossOverlay } from "./LifeLossOverlay";
import { PlayerHand } from "./PlayerHand";

interface PlayingViewProps {
  lobby: SocketLobbyState;
  myPlayerId: string | null;
  onExitGame: () => void;
  onCardPlay: (card: number) => void;
  onShurikenUse: () => void;
}

export function PlayingView({
  lobby,
  myPlayerId,
  onExitGame,
  onCardPlay,
  onShurikenUse,
}: PlayingViewProps) {
  const {
    lifeGainTick,
    lifeLossTick,
    shurikenGainTick,
    levelCompleteTick,
    lifeLossOverlayTick,
    completedLevelAnnouncement,
    lifeLossAnnouncement,
    lastLifeEvent,
  } = useLifeShurikenAnnouncements(lobby.lives, lobby.shurikens, lobby.currentLevel);

  const myPlayer = lobby.players.find((player) => player.id === myPlayerId);
  const otherPlayers = lobby.players.filter((player) => player.id !== myPlayerId);
  const pilePreview = lobby.discardPile.slice(-5);
  const winningLevel = lobby.winningLevel > 0 ? lobby.winningLevel : "?";
  const sortedHand = myPlayer?.hand.toSorted((a, b) => a - b) ?? [];

  return (
    <section className="relative mx-auto mt-8 flex min-h-[calc(100vh-13rem)] w-full max-w-4xl flex-col">
      <header className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <span className="uppercase tracking-[0.14em]">Level</span>
          <span className="text-base font-medium text-[var(--text-strong)]">
            {lobby.currentLevel}/{winningLevel}
          </span>
        </div>

        <div
          key={`lives-${lifeGainTick}-${lifeLossTick}`}
          className={`relative inline-flex items-center gap-1.5 text-[#ff8f9e] ${
            lastLifeEvent === "gain" && lifeGainTick > 0 ? "life-meter-gain" : ""
          } ${lastLifeEvent === "loss" && lifeLossTick > 0 ? "life-meter-loss" : ""}`}
          aria-label={`Lives: ${lobby.lives}`}
        >
          {Array.from({ length: Math.max(0, lobby.lives) }).map((_, index) => (
            <span
              key={`life-${index}`}
              className={`${
                lastLifeEvent === "gain" && lifeGainTick > 0
                  ? "life-icon-pop"
                  : lastLifeEvent === "loss" && lifeLossTick > 0
                    ? "life-icon-hit"
                    : ""
              }`}
            >
              <HeartIcon />
            </span>
          ))}
          {lastLifeEvent === "gain" && lifeGainTick > 0 && (
            <span key={`life-gain-${lifeGainTick}`} className="life-gain-label" aria-hidden="true">
              +1
            </span>
          )}
          {lastLifeEvent === "loss" && lifeLossTick > 0 && (
            <span key={`life-loss-${lifeLossTick}`} className="life-loss-label" aria-hidden="true">
              -1
            </span>
          )}
        </div>

        <div
          key={`shurikens-${shurikenGainTick}`}
          className={`relative inline-flex items-center gap-2 text-[var(--accent)] ${shurikenGainTick > 0 ? "shuriken-meter-gain" : ""}`}
          aria-label={`Shurikens: ${lobby.shurikens}`}
        >
          {Array.from({ length: Math.max(0, lobby.shurikens) }).map((_, index) => (
            <span key={`shuriken-${index}`} className={shurikenGainTick > 0 ? "shuriken-icon-spin" : ""}>
              <ShurikenIcon />
            </span>
          ))}
          {shurikenGainTick > 0 && (
            <span key={`shuriken-gain-${shurikenGainTick}`} className="shuriken-gain-label" aria-hidden="true">
              +1
            </span>
          )}
        </div>

        <div className="ml-auto inline-flex items-center gap-3">
          <button
            onClick={onShurikenUse}
            aria-label="Use shuriken"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[var(--accent)] text-[var(--accent)] transition hover:bg-[var(--accent-soft)]"
          >
            <ShurikenIcon />
          </button>

          <button
            onClick={onExitGame}
            className="text-sm font-medium text-[#ffc5cc] underline-offset-4 transition hover:underline"
          >
            Exit Game
          </button>
        </div>
      </header>

      <GameTable opponents={otherPlayers}>
        {completedLevelAnnouncement !== null && (
          <LevelCompleteOverlay
            tick={levelCompleteTick}
            completedLevel={completedLevelAnnouncement.completedLevel}
            currentLevel={lobby.currentLevel}
            gainedLives={completedLevelAnnouncement.gainedLives}
            gainedShurikens={completedLevelAnnouncement.gainedShurikens}
          />
        )}

        {lifeLossAnnouncement !== null && (
          <LifeLossOverlay tick={lifeLossOverlayTick} lostLives={lifeLossAnnouncement.lostLives} />
        )}

        <DiscardPile cards={pilePreview} />
      </GameTable>

      <div className="mt-auto pb-2">
        <div className="mt-4 overflow-x-auto px-2 pb-2">
          <PlayerHand cards={sortedHand} onCardPlay={onCardPlay} />
        </div>
      </div>
    </section>
  );
}
