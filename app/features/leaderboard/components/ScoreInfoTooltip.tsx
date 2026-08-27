"use client";

import { useEffect, useRef, useState } from "react";

// A small "i" button that reveals a popover explaining how the leaderboard
// score is computed, for anyone who wants more than the terse per-row summary.
export function ScoreInfoTooltip() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-label="How is the score computed?"
        className="flex h-4 w-4 items-center justify-center rounded-full border border-[var(--text-muted)] text-[10px] font-semibold leading-none text-[var(--text-muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        i
      </button>

      {isOpen ? (
        <div
          role="tooltip"
          className="absolute left-1/2 top-full z-10 mt-2 w-64 -translate-x-1/2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-2)] p-3 text-left text-xs leading-relaxed text-[var(--text-muted)] shadow-lg"
        >
          <p className="mb-1 font-semibold text-[var(--text-strong)]">How the score is computed</p>
          <p>
            Score = time to win + 20s for every life lost + 20s for every shuriken used.
            Lower is better - a clean run beats a slower one padded with mistakes.
          </p>
        </div>
      ) : null}
    </div>
  );
}
