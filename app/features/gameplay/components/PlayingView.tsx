import { useEffect, useRef, useState } from "react";
import type { SocketLobbyState } from "../../lobby/types";

interface PlayingViewProps {
  lobby: SocketLobbyState;
  myPlayerId: string | null;
  onExitGame: () => void;
  onCardPlay: (card: number) => void;
  onShurikenUse: () => void;
}

interface LevelCompletionAnnouncement {
  completedLevel: number;
  gainedLives: number;
  gainedShurikens: number;
}

interface LifeLossAnnouncement {
  lostLives: number;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="currentColor">
      <path d="M12 21c-.3 0-.6-.1-.8-.3C7 16.9 4 14.2 4 10.7 4 8.1 6.1 6 8.7 6c1.3 0 2.6.6 3.3 1.6C12.7 6.6 14 6 15.3 6 17.9 6 20 8.1 20 10.7c0 3.5-3 6.2-7.2 10-.2.2-.5.3-.8.3z" />
    </svg>
  );
}

function ShurikenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l2.5 4.5L20 10l-4.5 2L13 21l-2-4.5L4 14l4.5-2L11 3z" />
      <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19c.7-3 3.2-5 6.5-5s5.8 2 6.5 5" />
    </svg>
  );
}

export function PlayingView({
  lobby,
  myPlayerId,
  onExitGame,
  onCardPlay,
  onShurikenUse,
}: PlayingViewProps) {
  const previousLivesRef = useRef(lobby.lives);
  const previousShurikensRef = useRef(lobby.shurikens);
  const previousLevelRef = useRef(lobby.currentLevel);
  const levelOverlayTimeoutRef = useRef<number | undefined>(undefined);
  const lifeLossOverlayTimeoutRef = useRef<number | undefined>(undefined);
  const [lifeGainTick, setLifeGainTick] = useState(0);
  const [lifeLossTick, setLifeLossTick] = useState(0);
  const [shurikenGainTick, setShurikenGainTick] = useState(0);
  const [levelCompleteTick, setLevelCompleteTick] = useState(0);
  const [lifeLossOverlayTick, setLifeLossOverlayTick] = useState(0);
  const [completedLevelAnnouncement, setCompletedLevelAnnouncement] = useState<LevelCompletionAnnouncement | null>(null);
  const [lifeLossAnnouncement, setLifeLossAnnouncement] = useState<LifeLossAnnouncement | null>(null);
  const [lastLifeEvent, setLastLifeEvent] = useState<"gain" | "loss" | null>(null);

  useEffect(() => {
    let timeoutId: number | undefined;
    if (lobby.currentLevel > previousLevelRef.current) {
      const completedLevel = Math.max(1, lobby.currentLevel - 1);
      const gainedLives = Math.max(0, lobby.lives - previousLivesRef.current);
      const gainedShurikens = Math.max(0, lobby.shurikens - previousShurikensRef.current);

      timeoutId = window.setTimeout(() => {
        setLevelCompleteTick((tick) => tick + 1);
        setCompletedLevelAnnouncement({
          completedLevel,
          gainedLives,
          gainedShurikens,
        });
      }, 0);

      if (levelOverlayTimeoutRef.current !== undefined) {
        window.clearTimeout(levelOverlayTimeoutRef.current);
      }

      levelOverlayTimeoutRef.current = window.setTimeout(() => {
        setCompletedLevelAnnouncement(null);
      }, 2500);
    }

    previousLevelRef.current = lobby.currentLevel;
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [lobby.currentLevel, lobby.lives, lobby.shurikens]);

  useEffect(() => {
    let timeoutId: number | undefined;
    if (lobby.lives > previousLivesRef.current) {
      timeoutId = window.setTimeout(() => {
        setLifeGainTick((tick) => tick + 1);
        setLastLifeEvent("gain");
      }, 0);
    } else if (lobby.lives < previousLivesRef.current) {
      const lostLives = Math.max(1, previousLivesRef.current - lobby.lives);
      timeoutId = window.setTimeout(() => {
        setLifeLossTick((tick) => tick + 1);
        setLastLifeEvent("loss");
        setLifeLossOverlayTick((tick) => tick + 1);
        setLifeLossAnnouncement({ lostLives });
      }, 0);

      if (lifeLossOverlayTimeoutRef.current !== undefined) {
        window.clearTimeout(lifeLossOverlayTimeoutRef.current);
      }

      lifeLossOverlayTimeoutRef.current = window.setTimeout(() => {
        setLifeLossAnnouncement(null);
      }, 2500);
    }
    previousLivesRef.current = lobby.lives;
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [lobby.lives]);

  useEffect(() => {
    let timeoutId: number | undefined;
    if (lobby.shurikens > previousShurikensRef.current) {
      timeoutId = window.setTimeout(() => {
        setShurikenGainTick((tick) => tick + 1);
      }, 0);
    }
    previousShurikensRef.current = lobby.shurikens;
    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [lobby.shurikens]);

  useEffect(() => {
    return () => {
      if (levelOverlayTimeoutRef.current !== undefined) {
        window.clearTimeout(levelOverlayTimeoutRef.current);
      }
      if (lifeLossOverlayTimeoutRef.current !== undefined) {
        window.clearTimeout(lifeLossOverlayTimeoutRef.current);
      }
    };
  }, []);

  const myPlayer = lobby.players.find((player) => player.id === myPlayerId);
  const otherPlayers = lobby.players.filter((player) => player.id !== myPlayerId);
  const pilePreview = lobby.discardPile.slice(-5);
  const winningLevel = lobby.winningLevel > 0 ? lobby.winningLevel : "?";
  const sortedHand = myPlayer?.hand.toSorted((a, b) => a - b) ?? [];
  const handCount = sortedHand.length;
  const overlapPx = handCount <= 1 ? 0 : Math.min(42, Math.max(10, Math.round(8 + (handCount - 1) * 3.6)));
  const tiltCap = handCount >= 9 ? 1 : handCount >= 6 ? 2 : 3;

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

      <ul className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        {otherPlayers.length === 0 ? (
          <li className="text-sm text-[var(--text-muted)]">No other players connected.</li>
        ) : (
          otherPlayers.map((player) => (
            <li key={player.id} className="inline-flex items-center gap-2 text-sm text-[var(--text-strong)]">
              <span className="text-[var(--text-muted)]">
                <UserIcon />
              </span>
              <span>{player.name}</span>
              <span className="text-xs text-[var(--accent)]">{player.handSize}</span>
            </li>
          ))
        )}
      </ul>

      <div className="relative mt-8 flex min-h-44 items-center justify-center">
        {completedLevelAnnouncement !== null && (
          <div
            key={`level-overlay-${levelCompleteTick}`}
            className="discard-announcement-overlay level-complete-overlay"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="level-complete-card">
              <p className="level-complete-title">LEVEL {completedLevelAnnouncement.completedLevel} COMPLETE!</p>
              <p className="level-complete-subtitle">Incoming Level {lobby.currentLevel}</p>
              <div className="level-complete-rewards">
                {completedLevelAnnouncement.gainedLives > 0 && (
                  <span
                    className={`level-reward-pill ${
                      completedLevelAnnouncement.gainedLives > 0 ? "level-reward-pill-life" : "level-reward-pill-muted"
                    }`}
                  >
                    Lives +{completedLevelAnnouncement.gainedLives}
                  </span>
                )}
                {completedLevelAnnouncement.gainedShurikens > 0 && (
                  <span
                    className={`level-reward-pill ${
                      completedLevelAnnouncement.gainedShurikens > 0 ? "level-reward-pill-shuriken" : "level-reward-pill-muted"
                    }`}
                  >
                    Shurikens +{completedLevelAnnouncement.gainedShurikens}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {lifeLossAnnouncement !== null && (
          <div
            key={`life-loss-overlay-${lifeLossOverlayTick}`}
            className="discard-announcement-overlay life-loss-overlay"
            aria-live="assertive"
            aria-atomic="true"
          >
            <div className="life-loss-card">
              <p className="life-loss-title">Wrong Card Played!</p>
              <p className="life-loss-subtitle">Team loses {lifeLossAnnouncement.lostLives} life</p>
            </div>
          </div>
        )}

        {pilePreview.length > 0 ? (
          <div className="relative h-40 w-full max-w-sm">
            {pilePreview.map((card, index) => {
              const spread = index - (pilePreview.length - 1) / 2;
              const offsetX = spread * 24;
              const rotation = spread * 5;

              return (
                <div
                  key={`${card}-${index}`}
                  className="absolute left-1/2 top-2 h-32 w-[5.5rem] rounded-2xl border border-[#d8d2bf] bg-gradient-to-b from-[#fffef8] to-[#efe8d7] text-slate-900 shadow-[0_8px_22px_rgba(0,0,0,0.35)]"
                  style={{
                    zIndex: index + 1,
                    transform: `translate(-50%, 0) translateX(${offsetX}px) rotate(${rotation}deg)`,
                  }}
                >
                  <div className="flex h-full flex-col items-center justify-between p-3">
                    <span className="self-start text-xs font-semibold text-slate-500">TM</span>
                    <span className="text-3xl font-semibold">{card}</span>
                    <span className="self-end text-xs font-semibold text-slate-500">TM</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]/85">No cards on the table yet.</p>
        )}
      </div>

      <div className="mt-auto pb-2">

        <div className="mt-4 flex justify-center overflow-x-auto px-2 pb-2">
          {sortedHand.length ? (
            <div className="isolate flex items-end py-1">
              {sortedHand.map((card, index) => {
                const tilt = (index % 2 === 0 ? -1 : 1) * Math.min(index, tiltCap);

                return (
                  <div
                    key={card}
                    className="flex-none"
                    style={{
                      marginInlineStart: index === 0 ? 0 : `-${overlapPx}px`,
                      transform: `rotate(${tilt}deg)`,
                      zIndex: sortedHand.length - index,
                    }}
                  >
                    <button
                      onClick={() => onCardPlay(card)}
                      className="h-32 w-[5.5rem] rounded-2xl border border-[#d8d2bf] bg-gradient-to-b from-[#fffef8] to-[#efe8d7] text-slate-900 shadow-[0_8px_22px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 focus-visible:-translate-y-1"
                      aria-label={`Play card ${card}`}
                    >
                      <div className="flex h-full flex-col items-center justify-between p-3">
                        <span className="self-start text-xs font-semibold text-slate-500">TM</span>
                        <span className="text-3xl font-semibold">{card}</span>
                        <span className="self-end text-xs font-semibold text-slate-500">TM</span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="px-1 text-sm text-[var(--text-muted)]">No cards in hand.</p>
          )}
        </div>
      </div>
    </section>
  );
}
