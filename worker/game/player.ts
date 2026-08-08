export class Player {
  id: string;
  name: string;
  hand: number[];

  constructor(id: string, name: string, hand: number[]) {
    this.id = id;
    this.name = name;
    this.hand = hand;
  }

  public lowestCard(): number | null {
    if (this.hand.length === 0) {
      return null;
    }
    return Math.min(...this.hand);
  }

  public hasMoreThanXCards(x: number): boolean {
    return this.hand.length > x;
  }

  public discardCards(cardsToDiscard: number[]) {
    this.hand = this.hand.filter((card: number) => !cardsToDiscard.includes(card));
  }

  public resetHand() {
    this.hand = [];
  }

  public getPayload() {
    return {
      id: this.id,
      name: this.name,
      hand: this.hand,
      handSize: this.hand.length,
    };
  }
}