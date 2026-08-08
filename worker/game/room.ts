import { Player } from "./player.ts";
export class Room {
  players: Player[] = [];
  discardPile: number[] = [];
  lives: number = 0;
  shurikens: number = 0;
  currentLevel: number = 0;
  winningLevel: number = 0;
  state: "waiting" | "playing" | "won" | "lost" = "waiting";
  hostPlayerId: string | null = null;

  private highestCardInGame(): number | null {
    const allCards = this.players.flatMap((player) => player.hand);
    if (allCards.length === 0) {
      return null;
    }
    return Math.max(...allCards);
  }

  private lowestCardInGame(): number | null {
    const allCards = this.players.flatMap((player) => player.hand);
    if (allCards.length === 0) {
      return null;
    }
    return Math.min(...allCards);
  }

  private playerWithCards(): Player[] {
    return this.players.filter((player) => player.hand.length > 0);
  }

  private cardsInGame(): number[] {
    return this.players.flatMap((player) => player.hand);
  }

  private discardCards(cardsToDiscard: number[]) {
    for (const player of this.players) {
      player.discardCards(cardsToDiscard);
    }
    this.discardPile.push(...cardsToDiscard);
  }

  private goToNextLevel() {
    this.discardPile = [];
    if (this.currentLevel >= this.winningLevel) {
      this.state = "won";
    } else {
      this.currentLevel += 1;
      this.dealCards();
      this.assignRewards();
    }
  }

  public tryUseShuriken(): boolean {
    if (this.shurikens <= 0) {
      return false;
    }
    let cardsToAdd: number[] = this.players.some((player) => player.hasMoreThanXCards(1)) ?
      this.playerWithCards().flatMap((player) => player.lowestCard() ?? []) :
      this.cardsInGame().filter((card) => card !== this.highestCardInGame());

    for (const player of this.players) {
      player.hand = player.hand.filter((card: number) => !cardsToAdd.includes(card));
    }
    this.shurikens -= 1;
    this.discardPile.push(...cardsToAdd);
    return true;
  }

  private dealCards() {
    const deck = Array.from({ length: 100 }, (_, i) => i + 1).sort(
      () => Math.random() - 0.5,
    );
    const numPlayers = this.players.length;

    this.players.forEach((player, index) => {
      player.hand = deck
        .filter((_, i) => i % numPlayers === index)
        .slice(0, this.currentLevel);
    });
  }

  public startGame(): boolean {
    if (this.state === "playing") {
      return false;
    }

    this.state = "playing";
    this.lives = this.players.length <= 4 ? this.players.length : 4;
    this.shurikens = 1;
    this.currentLevel = 1;
    this.discardPile = [];
    switch (this.players.length) {
      case 2: this.winningLevel = 12; break;
      case 3: this.winningLevel = 10; break;
      case 4: this.winningLevel = 8; break;
      default: this.winningLevel = 8; break;
    }
    this.dealCards();
    return true;
  }

  // Assign rewards to the lobby based on the current level
  private assignRewards() {
    if ([2, 5, 8].includes(this.currentLevel)) {
      this.shurikens = Math.min(this.shurikens + 1, 3);
    } else if ([3, 6, 9].includes(this.currentLevel)) {
      this.lives = Math.min(this.lives + 1, 5);
    }
  }

  public setRoomForNewGame() {
    this.state = "waiting";
    this.discardPile = [];
    this.lives = 0;
    this.shurikens = 0;
    this.currentLevel = 0;
    this.winningLevel = 0;
    this.players.forEach((player) => player.resetHand());
  }

  public playerHasCard(playerId: string, card: number): boolean {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) {
      return false;
    }
    return player.hand.includes(card);
  }

  // Let the lobby react if the played card is the lowest card in the game.
  // If it is, remove the card from all players' hands and add it to the discard pile.
  // When all players have no cards left, the level is completed and the game progresses to the next level.
  // If the played card is not the lowest, remove all cards lower than or equal to the played card from all players' hands and add them to the discard pile.
  public playCard(playedCard: number): boolean {
    const minCard = this.lowestCardInGame();

    if (playedCard === minCard) {
      this.discardCards([playedCard]);
      // check for level completion
      if (this.cardsInGame().length === 0) {
        this.goToNextLevel();
      }
      return true;
    }
    this.lives -= 1;
    if (this.lives <= 0) {
      this.state = "lost";
    }
    let lateCards = this.cardsInGame().filter((card) => card <= playedCard);
    if (lateCards.length === this.cardsInGame().length) {
      // Don't consider the played card if it would be the last one to be played to complete the level. 
      // This makes it easier to handle the event of level completion without overlapping two animations (the one for playing the wrong card and the one for completing the level).
      lateCards = lateCards.filter((card) => card !== playedCard);
    }
    this.discardCards(lateCards);
    return false;
  }

  public isPlayerNameInUse(playerName: string): boolean {
    return this.players.some((player) => player.name.trim().toLowerCase() === playerName.trim().toLowerCase());
  }

  public getPlayerByName(playerName: string): Player | undefined {
    return this.players.find((player) => player.name.trim().toLowerCase() === playerName.trim().toLowerCase());
  }

  public getPayload() {
    return {
      ...this,
      players: this.players.map((p) => p.getPayload()),
    };
  }

  public restoreHostPlayerId() {
    if (this.hostPlayerId === null && this.players.length > 0) {
      this.hostPlayerId = this.players[0].id;
    }
    const hostPlayerExists = this.players.some(player => player.id === this.hostPlayerId);
    if (!hostPlayerExists) {
      this.hostPlayerId = this.players.length > 0 ? this.players[0].id : null;
    }
  }

  public createAddPlayer(playerName: string): Player {
    const playerId = crypto.randomUUID();
    const newPlayer = new Player(playerId, playerName, []);
    this.players.push(newPlayer);

    if (!this.hostPlayerId) {
      this.hostPlayerId = playerId;
    }

    return newPlayer;
  }

  public removePlayer(playerId: string) {
    this.players = this.players.filter((player) => player.id !== playerId);

    if (this.hostPlayerId === playerId) {
      this.hostPlayerId = this.players[0]?.id ?? null;
    }
  }

  public tryGetPlayerById(playerId: string | null): Player | undefined {
    if (!playerId) {
      return undefined;
    }
    return this.players.find((player) => player.id === playerId);
  }
}

export function createEmptyRoom(): Room {
  return new Room();
}