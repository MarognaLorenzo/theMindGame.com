import { LEADERBOARD_READ_LIMIT } from "./leaderboardTypes.ts";

export interface PendingReviewEntry {
  id: number;
  team_name: string;
  country_code: string;
  player_count: number;
  final_seconds: number;
  created_at: string;
  // Whether this entry, if approved now, would rank within the public top
  // LEADERBOARD_READ_LIMIT for its team size - i.e. whether anyone would see it.
  makesBoard: boolean;
}

// Every pending entry, the ones that would make the public board first (oldest
// first within each group). Evaluated against the approved rows as they stand
// right now, so an entry's priority can change as others get approved.
export async function fetchReviewQueue(db: D1Database): Promise<PendingReviewEntry[]> {
  const { results } = await db
    .prepare(
      `SELECT p.id, p.team_name, p.country_code, p.player_count,
              p.final_seconds, p.created_at,
              (SELECT COUNT(*) FROM leaderboard a
                WHERE a.status = 'approved'
                  AND a.player_count = p.player_count
                  AND a.final_seconds < p.final_seconds) < ? AS makes_board
         FROM leaderboard p
        WHERE p.status = 'pending'
        ORDER BY makes_board DESC, p.created_at ASC, p.id ASC`,
    )
    .bind(LEADERBOARD_READ_LIMIT)
    .all<Omit<PendingReviewEntry, "makesBoard"> & { makes_board: number }>();

  return results.map(({ makes_board, ...entry }) => ({
    ...entry,
    makesBoard: makes_board === 1,
  }));
}
