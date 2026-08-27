-- Leaderboard of won games, one table for all team sizes. Times are only
-- comparable within the same player_count (winningLevel varies by team size),
-- so reads always filter on it.

CREATE TABLE leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  player_count INTEGER NOT NULL CHECK (player_count IN (2, 3, 4)),
  final_seconds REAL NOT NULL,
  lives_lost_count INTEGER NOT NULL DEFAULT 0,
  shurikens_used_count INTEGER NOT NULL DEFAULT 0,
  lobby_short_code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_leaderboard_ranking ON leaderboard (player_count, status, final_seconds);
