import type { LobbyPlayer } from "../../lobby/types";
import { UserIcon } from "./icons";

function OtherPlayerHandIndicator({ handSize }: { handSize: number }) {
  const previewCount = Math.min(3, Math.max(0, handSize));

  return (
    <span className="inline-flex items-center gap-2" aria-label={`${handSize} cards in hand`}>
      <span className="relative h-4 w-4" aria-hidden="true">
        {Array.from({ length: previewCount }).map((_, index) => (
          <span
            key={`hand-preview-${index}`}
            className="absolute top-0 h-4 w-3 rounded-sm border border-[#d8d2bf] bg-gradient-to-b from-[#fffef8] to-[#efe8d7] shadow-[0_2px_6px_rgba(0,0,0,0.25)]"
            style={{
              left: `${index * 4}px`,
              zIndex: index + 1,
            }}
          />
        ))}
      </span>
      <span className="text-xs font-semibold tabular-nums text-[var(--accent)]">
        {handSize}
      </span>
    </span>
  );
}

interface OpponentsListProps {
  players: LobbyPlayer[];
}

export function OpponentsList({ players }: OpponentsListProps) {
  return (
    <ul className="mt-5 flex flex-wrap items-center gap-2.5">
      {players.length === 0 ? (
        <li className="text-sm text-[var(--text-muted)]">No other players connected.</li>
      ) : (
        players.map((player) => (
          <li
            key={player.id}
            className="inline-flex items-center gap-2 rounded-full border border-[#3b4f6d]/65 bg-[#0f1e33]/75 px-3 py-1.5 text-sm text-[var(--text-strong)]"
          >
            <span className="inline-flex items-center gap-2">
              <span className="text-[var(--text-muted)]">
                <UserIcon />
              </span>
              <span className="font-medium">{player.name}</span>
            </span>
            <span className="h-4 w-px bg-[#415b7f]" aria-hidden="true" />
            <OtherPlayerHandIndicator handSize={player.handSize} />
          </li>
        ))
      )}
    </ul>
  );
}
