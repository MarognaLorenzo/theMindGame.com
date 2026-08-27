// Mirrors WIN_STATS_PENALTY_SECONDS in worker/game/room.ts. The API only
// returns the already-aggregated final_seconds plus the raw event counts, so
// this reconstructs the breakdown for display purposes only.
const PENALTY_SECONDS_PER_EVENT = 20;

export interface ScoreBreakdown {
  baseSeconds: number;
  livesPenaltySeconds: number;
  shurikensPenaltySeconds: number;
}

export function breakDownScore(entry: {
  finalSeconds: number;
  livesLostCount: number;
  shurikensUsedCount: number;
}): ScoreBreakdown {
  const livesPenaltySeconds = entry.livesLostCount * PENALTY_SECONDS_PER_EVENT;
  const shurikensPenaltySeconds = entry.shurikensUsedCount * PENALTY_SECONDS_PER_EVENT;

  return {
    baseSeconds: entry.finalSeconds - livesPenaltySeconds - shurikensPenaltySeconds,
    livesPenaltySeconds,
    shurikensPenaltySeconds,
  };
}

export function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(1)}s`;
}
