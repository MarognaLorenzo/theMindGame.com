export interface Player {
  id: string;
  name: string;
  hand: number[];
}

export interface PlayerAttachment {
  playerId: string;
  playerName: string;
}

export interface Lobby {
  players: Player[];
  discardPile: number[];
  lives: number;
  shurikens: number;
  currentLevel: number;
  state: "waiting" | "playing" | "won" | "lost";
  hostPlayerId: string | null;
}

export function createInitialLobby(): Lobby {
  return {
    players: [],
    discardPile: [],
    lives: 3,
    shurikens: 2,
    currentLevel: 1,
    state: "waiting",
    hostPlayerId: null,
  };
}

export function addPlayer(lobby: Lobby, playerName: string): Player {
  const playerId = crypto.randomUUID();
  const newPlayer: Player = { id: playerId, name: playerName, hand: [] };
  lobby.players.push(newPlayer);

  if (!lobby.hostPlayerId) {
    lobby.hostPlayerId = playerId;
  }

  return newPlayer;
}

export function removePlayer(lobby: Lobby, playerId: string) {
  lobby.players = lobby.players.filter((player) => player.id !== playerId);

  if (lobby.hostPlayerId === playerId) {
    lobby.hostPlayerId = lobby.players[0]?.id ?? null;
  }
}

export function playCard(lobby: Lobby, playedCard: number): boolean {
  const allCards = lobby.players.flatMap((player) => player.hand);
  const minCard = Math.min(...allCards);

  if (playedCard === minCard) {
    lobby.players.forEach((player) => {
      player.hand = player.hand.filter((card) => card !== playedCard);
    });
    lobby.discardPile.push(playedCard);

    // check for level completion
    if (lobby.players.every((player) => player.hand.length === 0)) {
      if (lobby.currentLevel >= 10) {
        lobby.state = "won";
      } else {
        dealNewLevel(lobby);
      }
    }

    return true;
  }

  lobby.lives -= 1;
  return false;
}

export function useShuriken(lobby: Lobby): number | null {
  if (lobby.shurikens <= 0) {
    return null;
  }

  const allCards = lobby.players.flatMap((player) => player.hand);
  const lowestCard = Math.min(...allCards);

  lobby.shurikens -= 1;
  lobby.discardPile.push(lowestCard);
  lobby.players.forEach((player) => {
    player.hand = player.hand.filter((card) => card !== lowestCard);
  });

  return lowestCard;
}

export function startGame(lobby: Lobby): boolean {
  if (lobby.state !== "waiting") {
    return false;
  }

  lobby.state = "playing";
  lobby.lives = lobby.players.length;
  lobby.shurikens = 1;
  lobby.currentLevel = 0;
  dealNewLevel(lobby);
  return true;
}

export function dealNewLevel(lobby: Lobby) {
  lobby.currentLevel += 1;
  const deck = Array.from({ length: 100 }, (_, i) => i + 1).sort(
    () => Math.random() - 0.5,
  );
  const numPlayers = lobby.players.length;

  lobby.players.forEach((player, index) => {
    player.hand = deck
      .filter((_, i) => i % numPlayers === index)
      .slice(0, lobby.currentLevel);
  });
}