interface LevelCompleteOverlayProps {
  tick: number;
  completedLevel: number;
  currentLevel: number;
  gainedLives: number;
  gainedShurikens: number;
}

export function LevelCompleteOverlay({
  tick,
  completedLevel,
  currentLevel,
  gainedLives,
  gainedShurikens,
}: LevelCompleteOverlayProps) {
  return (
    <div
      key={`level-overlay-${tick}`}
      className="discard-announcement-overlay level-complete-overlay"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="level-complete-card">
        <p className="level-complete-title">LEVEL {completedLevel} COMPLETE!</p>
        <p className="level-complete-subtitle">Incoming Level {currentLevel}</p>
        <div className="level-complete-rewards">
          {gainedLives > 0 && (
            <span className="level-reward-pill level-reward-pill-life">
              Lives +{gainedLives}
            </span>
          )}
          {gainedShurikens > 0 && (
            <span className="level-reward-pill level-reward-pill-shuriken">
              Shurikens +{gainedShurikens}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
