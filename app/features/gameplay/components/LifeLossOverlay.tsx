interface LifeLossOverlayProps {
  tick: number;
  lostLives: number;
}

export function LifeLossOverlay({ tick, lostLives }: LifeLossOverlayProps) {
  return (
    <div
      key={`life-loss-overlay-${tick}`}
      className="discard-announcement-overlay life-loss-overlay"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="life-loss-card">
        <p className="life-loss-title">Wrong Card Played!</p>
        <p className="life-loss-subtitle">Team loses {lostLives} life</p>
      </div>
    </div>
  );
}
