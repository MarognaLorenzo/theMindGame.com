import { countryCodeToFlagEmoji } from "../lib/countryFlag";
import { breakDownScore, formatSeconds } from "../lib/scoring";
import type { LeaderboardEntry } from "../types";

interface LeaderboardEntryRowProps {
  rank: number;
  entry: LeaderboardEntry;
}

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function LeaderboardEntryRow({ rank, entry }: LeaderboardEntryRowProps) {
  const { baseSeconds, livesPenaltySeconds, shurikensPenaltySeconds } = breakDownScore(entry);

  const breakdownParts = [`${formatSeconds(baseSeconds)} base`];
  if (entry.livesLostCount > 0) {
    breakdownParts.push(
      `+${formatSeconds(livesPenaltySeconds)} (${entry.livesLostCount} ${entry.livesLostCount === 1 ? "life" : "lives"} lost)`,
    );
  }
  if (entry.shurikensUsedCount > 0) {
    breakdownParts.push(
      `+${formatSeconds(shurikensPenaltySeconds)} (${entry.shurikensUsedCount} ${entry.shurikensUsedCount === 1 ? "shuriken" : "shurikens"} used)`,
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] px-3 py-3 sm:gap-4 sm:px-4">
      <span className="w-6 shrink-0 text-center text-sm font-semibold text-[var(--text-muted)]">
        {RANK_MEDALS[rank] ?? `#${rank}`}
      </span>
      <span className="text-2xl leading-none" aria-hidden="true">
        {countryCodeToFlagEmoji(entry.countryCode)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--text-strong)]">{entry.teamName}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
          {breakdownParts.join(" · ")}
        </p>
      </div>
      <span className="shrink-0 text-lg font-bold text-[var(--accent)]">
        {formatSeconds(entry.finalSeconds)}
      </span>
    </li>
  );
}
