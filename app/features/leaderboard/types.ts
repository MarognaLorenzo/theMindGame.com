// Row shape returned by GET /api/leaderboard (see worker/api/leaderboard/leaderboardOperations.ts).
export interface LeaderboardApiRow {
  team_name: string;
  country_code: string;
  player_count: number;
  final_seconds: number;
  lives_lost_count: number;
  shurikens_used_count: number;
  created_at: string;
}

export interface LeaderboardApiResponse {
  entries?: LeaderboardApiRow[];
}

export interface LeaderboardEntry {
  teamName: string;
  countryCode: string;
  playerCount: number;
  finalSeconds: number;
  livesLostCount: number;
  shurikensUsedCount: number;
  createdAt: string;
}

export function mapLeaderboardRow(row: LeaderboardApiRow): LeaderboardEntry {
  return {
    teamName: row.team_name,
    countryCode: row.country_code,
    playerCount: row.player_count,
    finalSeconds: row.final_seconds,
    livesLostCount: row.lives_lost_count,
    shurikensUsedCount: row.shurikens_used_count,
    createdAt: row.created_at,
  };
}
