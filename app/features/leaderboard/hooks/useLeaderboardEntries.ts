"use client";

import { useEffect, useRef, useState } from "react";
import type { LeaderboardApiResponse, LeaderboardEntry } from "../types";
import { mapLeaderboardRow } from "../types";

export type LeaderboardFetchStatus = "loading" | "loaded" | "error";

// Fetches (and caches, per player count, for the lifetime of this hook instance)
// the approved leaderboard entries for a given team size.
export function useLeaderboardEntries(
  workerBaseUrl: string,
  playerCount: number,
  isOpen: boolean,
) {
  const cacheRef = useRef<Partial<Record<number, LeaderboardEntry[]>>>({});
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [status, setStatus] = useState<LeaderboardFetchStatus>("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const cached = cacheRef.current[playerCount];
    if (cached) {
      setEntries(cached);
      setStatus("loaded");
      return;
    }

    let cancelled = false;
    setStatus("loading");
    setError("");

    fetch(`${workerBaseUrl}/api/leaderboard?playerCount=${playerCount}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load leaderboard (${res.status})`);
        }
        const data = (await res.json()) as LeaderboardApiResponse;
        return (data.entries ?? []).map(mapLeaderboardRow);
      })
      .then((mapped) => {
        if (cancelled) return;
        cacheRef.current[playerCount] = mapped;
        setEntries(mapped);
        setStatus("loaded");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, playerCount, workerBaseUrl]);

  return { entries, status, error };
}
