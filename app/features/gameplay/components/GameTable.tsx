import type { ReactNode } from "react";

import type { LobbyPlayer } from "../../lobby/types";
import { CardBack } from "./CardBack";
import { UserIcon } from "./icons";

// How many face-down cards to fan out for an opponent, regardless of how many
// they actually hold - past this it stops reading as a fan and just looks noisy.
const MAX_FAN = 5;

function OpponentSeat({ player }: { player: LobbyPlayer }) {
  const fanCount = Math.min(MAX_FAN, Math.max(0, player.handSize));
  const isClear = player.handSize === 0;

  return (
    <div className="flex flex-none flex-col items-center gap-1.5">
      <div className="relative h-10 w-16" aria-hidden="true">
        {isClear ? (
          <span className="absolute inset-x-0 bottom-0 flex h-8 items-center justify-center rounded-lg border border-dashed border-[#3b4f6d]/70 text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            clear
          </span>
        ) : (
          Array.from({ length: fanCount }).map((_, index) => {
            const spread = index - (fanCount - 1) / 2;

            return (
              <span
                key={`fan-${index}`}
                className="absolute bottom-0 left-1/2"
                style={{
                  transform: `translateX(-50%) translateX(${spread * 7}px) rotate(${spread * 7}deg)`,
                  transformOrigin: "bottom center",
                  zIndex: index,
                }}
              >
                <CardBack mini />
              </span>
            );
          })
        )}
      </div>

      <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#3b4f6d]/65 bg-[#0f1e33]/75 px-2.5 py-1 text-xs text-[var(--text-strong)]">
        <span className="text-[var(--text-muted)]">
          <UserIcon className="h-3.5 w-3.5" />
        </span>
        <span className="max-w-[6rem] truncate font-medium">{player.name}</span>
        <span className="h-3 w-px bg-[#415b7f]" aria-hidden="true" />
        <span
          className="font-semibold tabular-nums text-[var(--accent)]"
          aria-label={`${player.name}: ${player.handSize} cards in hand`}
        >
          {player.handSize}
        </span>
      </div>
    </div>
  );
}

function OpponentSeatRow({ opponents }: { opponents: LobbyPlayer[] }) {
  if (opponents.length === 0) {
    return (
      <p className="relative z-10 mb-3 text-sm text-[var(--text-muted)]">
        No other players connected.
      </p>
    );
  }

  return (
    // Centered while the seats fit; scrolls horizontally rather than clipping or
    // pushing the page wide once there are too many for the viewport (same trick
    // the hand uses). The negative margin tucks the fans onto the felt's edge.
    <div className="relative z-10 -mb-4 w-full max-w-2xl overflow-x-auto sm:-mb-5">
      <ul className="mx-auto flex w-max min-w-full items-end justify-center gap-x-4 px-2 sm:gap-x-7">
        {opponents.map((player) => (
          <li key={player.id} className="flex-none">
            <OpponentSeat player={player} />
          </li>
        ))}
      </ul>
    </div>
  );
}

interface GameTableProps {
  opponents: LobbyPlayer[];
  // The discard pile plus any announcement overlays - anything that belongs on
  // the felt itself.
  children: ReactNode;
}

// The shared play surface: opponents seated along the back edge, a felt table,
// and the discard pile resting on it.
export function GameTable({ opponents, children }: GameTableProps) {
  return (
    <div className="mt-6 flex min-w-0 flex-1 flex-col items-center justify-center">
      <OpponentSeatRow opponents={opponents} />

      <div className="game-felt relative flex min-h-[14rem] w-full max-w-2xl items-center justify-center px-4 py-6 sm:min-h-[16rem]">
        {children}
      </div>
    </div>
  );
}
