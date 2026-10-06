import { HeartIcon, ShurikenIcon } from "../../gameplay/components/icons";
import { countryCodeToFlagEmoji } from "../lib/countryFlag";
import { breakDownScore, formatSeconds } from "../lib/scoring";
import type { LeaderboardEntry } from "../types";

interface LeaderboardEntryRowProps {
  rank: number;
  entry: LeaderboardEntry;
}

// Rows above this rank get the "top" accent; the modal draws its divider here.
export const TOP_TIER_SIZE = 10;

const STAT_ICON_CLASSNAME = "h-3.5 w-3.5";

// Sizes live here too (not in the shared classes) so a tier can override them
// without two conflicting Tailwind utilities on the same element.
interface RankStyle {
  row: string;
  rank: string;
  flag: string;
  name: string;
  score: string;
}

// Gold / silver / bronze: tinted row, solid medal-coloured rank badge, and the
// score in the medal colour. First place is also bigger, with a stronger tint
// and a gold glow.
const PODIUM_STYLES: Record<number, RankStyle> = {
  1: {
    row: "py-4 border-[#f1ba6a] bg-gradient-to-r from-[#f1ba6a47] via-[#f1ba6a14] to-[var(--surface-2)] shadow-[0_0_18px_rgba(241,186,106,0.35)]",
    rank: "h-9 w-9 rounded-full bg-[#f1ba6a] text-base text-[#3e2b14] shadow-[0_0_12px_rgba(241,186,106,0.6)]",
    flag: "text-2xl",
    name: "text-base sm:text-lg",
    score: "text-xl sm:text-2xl text-[#ffd58f]",
  },
  2: {
    row: "py-3 border-[#c9d3dc88] bg-gradient-to-r from-[#c9d3dc24] to-[var(--surface-2)]",
    rank: "h-7 w-7 rounded-full bg-[#c9d3dc] text-sm text-[#1f2a33]",
    flag: "text-2xl",
    name: "text-base",
    score: "text-lg text-[#dfe7ee]",
  },
  3: {
    row: "py-3 border-[#d08a5a88] bg-gradient-to-r from-[#d08a5a26] to-[var(--surface-2)]",
    rank: "h-7 w-7 rounded-full bg-[#d08a5a] text-sm text-[#2e1a0c]",
    flag: "text-2xl",
    name: "text-base",
    score: "text-lg text-[#e9a77a]",
  },
};

const TOP_TIER_STYLE: RankStyle = {
  // Inset shadow rather than a thicker left border, so the stripe doesn't
  // push this row's contents out of line with the rows around it.
  row: "py-3 border-[var(--border-subtle)] bg-[var(--surface-2)] shadow-[inset_3px_0_0_var(--accent)]",
  rank: "text-sm text-[var(--accent)]",
  flag: "text-2xl",
  name: "text-base",
  score: "text-lg text-[var(--accent)]",
};

const DEFAULT_STYLE: RankStyle = {
  row: "py-3 border-[var(--border-subtle)] bg-[var(--surface-2)]",
  rank: "text-sm text-[var(--text-muted)]",
  flag: "text-2xl",
  name: "text-base",
  score: "text-lg text-[var(--accent)]",
};

function rankStyle(rank: number): RankStyle {
  return PODIUM_STYLES[rank] ?? (rank <= TOP_TIER_SIZE ? TOP_TIER_STYLE : DEFAULT_STYLE);
}

export function LeaderboardEntryRow({ rank, entry }: LeaderboardEntryRowProps) {
  const { baseSeconds } = breakDownScore(entry);
  const style = rankStyle(rank);
  const isPodium = rank in PODIUM_STYLES;

  return (
    <li className={`flex items-center gap-3 rounded-xl border px-3 sm:gap-4 sm:px-4 ${style.row}`}>
      <span className="flex w-9 shrink-0 justify-center">
        <span
          className={`flex items-center justify-center font-bold tabular-nums ${style.rank}`}
        >
          {isPodium ? rank : `#${rank}`}
        </span>
      </span>
      <span className={`leading-none ${style.flag}`} aria-hidden="true">
        {countryCodeToFlagEmoji(entry.countryCode)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold text-[var(--text-strong)] ${style.name}`}>{entry.teamName}</p>
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
      <span className={`shrink-0 font-bold ${style.score}`}>
        {formatSeconds(entry.finalSeconds)}
      </span>
    </li>
  );
}
