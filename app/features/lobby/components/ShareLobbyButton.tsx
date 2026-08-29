import { useEffect, useRef, useState } from "react";
import { buildJoinUrl, shareJoinLink } from "../lib/shareLink";
import { AlertIcon, CheckIcon, LinkIcon } from "./icons";

interface ShareLobbyButtonProps {
  lobbyId: string;
}

// A cancelled native share is a no-op and never becomes a feedback state.
type Feedback = "idle" | "copied" | "shared" | "error";

const LABELS: Record<Feedback, string> = {
  idle: "Copy invite link",
  copied: "Link copied!",
  shared: "Shared!",
  error: "Copy failed — select the link below",
};

const ICONS: Record<Feedback, typeof LinkIcon> = {
  idle: LinkIcon,
  copied: CheckIcon,
  shared: CheckIcon,
  error: AlertIcon,
};

export function ShareLobbyButton({ lobbyId }: ShareLobbyButtonProps) {
  const [feedback, setFeedback] = useState<Feedback>("idle");
  const resetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) {
        window.clearTimeout(resetTimer.current);
      }
    };
  }, []);

  async function onShare() {
    const outcome = await shareJoinLink(lobbyId);
    if (outcome === "cancelled") {
      return;
    }
    setFeedback(outcome);
    if (resetTimer.current !== null) {
      window.clearTimeout(resetTimer.current);
    }
    resetTimer.current = window.setTimeout(() => setFeedback("idle"), 2500);
  }

  if (!lobbyId) {
    return null;
  }

  const Icon = ICONS[feedback];
  const isSuccess = feedback === "copied" || feedback === "shared";
  const isError = feedback === "error";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onShare}
        aria-label={LABELS[feedback]}
        aria-live="polite"
        title={LABELS[feedback]}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${
          isSuccess
            ? "border-[var(--accent)] text-[var(--accent)]"
            : isError
              ? "border-red-400/70 text-red-400"
              : "border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-strong)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
        }`}
      >
        <Icon />
      </button>
      {isSuccess ? (
        <span
          key={feedback}
          aria-hidden="true"
          className="share-toast pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 whitespace-nowrap rounded-full border border-[var(--accent)]/40 bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--accent)] shadow-lg"
        >
          {LABELS[feedback]}
        </span>
      ) : null}
      {isError ? (
        <p className="absolute left-0 top-full z-10 mt-1.5 w-56 select-all break-all rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-2 text-xs text-[var(--text-muted)] shadow-lg">
          {buildJoinUrl(lobbyId)}
        </p>
      ) : null}
    </div>
  );
}
