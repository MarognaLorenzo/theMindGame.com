import { WinStats } from "../../game/room.ts";

// Single-use token issued to every player in a room the moment the game is won.
// Stored in the LobbyServer DO's own storage (the strongly-consistent source of
// truth for this game) and consumed by a single leaderboard submission.
export interface LeaderboardToken {
  token: string;
  expiresAt: number;
  used: boolean;
  stats: WinStats;
}

export type LeaderboardSubmitResult =
  | { ok: true }
  | { ok: false; error: string; status: number };

// Max stored length of a submitted team name; longer names are truncated.
export const MAX_TEAM_NAME_LENGTH = 30;

// How long a win stays eligible for leaderboard submission.
export const LEADERBOARD_TOKEN_TTL_MS = 5 * 60 * 1000;

export const LEADERBOARD_TOKEN_STORAGE_KEY = "leaderboard-token";

// Team sizes the leaderboard ranks (matches the D1 CHECK constraint on
// player_count). Games outside this range - e.g. a solo test game - are won
// normally but never become leaderboard-eligible.
export const VALID_LEADERBOARD_PLAYER_COUNTS = [2, 3, 4] as const;

export function isValidLeaderboardPlayerCount(playerCount: number): boolean {
  return (VALID_LEADERBOARD_PLAYER_COUNTS as readonly number[]).includes(playerCount);
}
