"use client";

import { useEffect, useState } from "react";
import { useLeaderboardEntries } from "../hooks/useLeaderboardEntries";
import { LeaderboardEntryRow } from "./LeaderboardEntryRow";

const PLAYER_COUNTS = [2, 3, 4] as const;
type PlayerCount = (typeof PLAYER_COUNTS)[number];

interface LeaderboardModalProps {
  workerBaseUrl: string;
  onClose: () => void;
}

export function LeaderboardModal({ workerBaseUrl, onClose }: LeaderboardModalProps) {
  const [activeCount, setActiveCount] = useState<PlayerCount>(2);
  const { entries, status, error } = useLeaderboardEntries(workerBaseUrl, activeCount, true);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#02050788] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Leaderboard"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-1)] shadow-[0_18px_80px_rgba(6,10,14,0.65)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2 className="text-lg font-semibold text-[var(--text-strong)]">🏆 Leaderboard</h2>
          <button
            onClick={onClose}
            aria-label="Close leaderboard"
            className="rounded-full p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--text-strong)]"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 px-5 pt-4" role="tablist" aria-label="Team size">
          {PLAYER_COUNTS.map((count) => (
            <button
              key={count}
              role="tab"
              aria-selected={activeCount === count}
              onClick={() => setActiveCount(count)}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                activeCount === count
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--accent)]"
              }`}
            >
              {count} Players
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {status === "loading" ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">Loading...</p>
          ) : null}

          {status === "error" ? (
            <p className="py-8 text-center text-sm text-[#ff8f8f]">Error: {error}</p>
          ) : null}

          {status === "loaded" && entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--text-muted)]">
              No approved runs yet for {activeCount} players. Be the first!
            </p>
          ) : null}

          {status === "loaded" && entries.length > 0 ? (
            <ol className="space-y-2">
              {entries.map((entry, index) => (
                <LeaderboardEntryRow
                  key={`${entry.teamName}-${entry.createdAt}-${index}`}
                  rank={index + 1}
                  entry={entry}
                />
              ))}
            </ol>
          ) : null}
        </div>
      </div>
    </div>
  );
}
