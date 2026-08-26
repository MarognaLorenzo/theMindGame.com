import { CARD_SURFACE_CLASSES, CardFace } from "./CardFace";

interface DiscardPileProps {
  cards: number[];
}

export function DiscardPile({ cards }: DiscardPileProps) {
  if (cards.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]/85">No cards on the table yet.</p>;
  }

  return (
    <div className="relative h-40 w-full max-w-sm">
      {cards.map((card, index) => {
        const spread = index - (cards.length - 1) / 2;
        const offsetX = spread * 24;
        const rotation = spread * 5;

        return (
          <div
            key={`${card}-${index}`}
            className={`absolute left-1/2 top-2 ${CARD_SURFACE_CLASSES}`}
            style={{
              zIndex: index + 1,
              transform: `translate(-50%, 0) translateX(${offsetX}px) rotate(${rotation}deg)`,
            }}
          >
            <CardFace value={card} />
          </div>
        );
      })}
    </div>
  );
}
