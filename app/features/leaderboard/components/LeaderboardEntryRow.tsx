import { HeartIcon, ShurikenIcon } from "../../gameplay/components/icons";
import { countryCodeToFlagEmoji } from "../lib/countryFlag";
import { breakDownScore, formatSeconds } from "../lib/scoring";
import type { LeaderboardEntry } from "../types";

interface LeaderboardEntryRowProps {
  rank: number;
  entry: LeaderboardEntry;
}

const RANK_MEDALS: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };
const STAT_ICON_CLASSNAME = "h-3.5 w-3.5";

export function LeaderboardEntryRow({ rank, entry }: LeaderboardEntryRowProps) {
  const { baseSeconds } = breakDownScore(entry);

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
        <p className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span>{formatSeconds(baseSeconds)}</span>
          {entry.livesLostCount > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[#ff8f8f]">
              <HeartIcon className={STAT_ICON_CLASSNAME} />
              {entry.livesLostCount}
            </span>
          ) : null}
          {entry.shurikensUsedCount > 0 ? (
            <span className="inline-flex items-center gap-0.5 text-[var(--accent)]">
              <ShurikenIcon className={STAT_ICON_CLASSNAME} />
              {entry.shurikensUsedCount}
            </span>
          ) : null}
        </p>
      </div>
      <span className="shrink-0 text-lg font-bold text-[var(--accent)]">
        {formatSeconds(entry.finalSeconds)}
      </span>
    </li>
  );
}
