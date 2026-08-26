import { CARD_SURFACE_CLASSES, CardFace } from "./CardFace";

interface PlayerHandProps {
  cards: number[];
  onCardPlay: (card: number) => void;
}

export function PlayerHand({ cards, onCardPlay }: PlayerHandProps) {
  if (!cards.length) {
    return <p className="px-1 text-center text-sm text-[var(--text-muted)]">No cards in hand.</p>;
  }

  const tiltCap = cards.length >= 9 ? 1 : cards.length >= 6 ? 2 : 3;
  const overlapPx =
    cards.length <= 1 ? 0 : Math.min(42, Math.max(10, Math.round(8 + (cards.length - 1) * 3.6)));

  return (
    // Centering via margin-inline: auto (rather than a flex justify-center on the
    // scrollable ancestor) keeps the row centered while it fits, but lets it collapse
    // to the start edge once it overflows - so the lowest card (index 0, the one a
    // player almost always wants) stays reachable at scrollLeft: 0 instead of being
    // pushed off to a negative offset most browsers won't scroll back to.
    <div className="isolate mx-auto flex w-fit items-end py-1">
      {cards.map((card, index) => {
        const tilt = (index % 2 === 0 ? -1 : 1) * Math.min(index, tiltCap);

        return (
          <div
            key={card}
            className="flex-none"
            style={{
              marginInlineStart: index === 0 ? 0 : `-${overlapPx}px`,
              transform: `rotate(${tilt}deg)`,
              zIndex: cards.length - index,
            }}
          >
            <button
              onClick={() => onCardPlay(card)}
              className={`${CARD_SURFACE_CLASSES} transition hover:-translate-y-1 focus-visible:-translate-y-1`}
              aria-label={`Play card ${card}`}
            >
              <CardFace value={card} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
