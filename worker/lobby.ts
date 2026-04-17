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
  winningLevel: number;
  state: "waiting" | "playing" | "won" | "lost";
  hostPlayerId: string | null;
}

export function createInitialLobby(): Lobby {
  return {
    players: [],
    discardPile: [],
    lives: 0,
    shurikens: 0,
    currentLevel: 0,
    winningLevel: 0,
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
      lobby.discardPile = [];
      if (lobby.currentLevel >= lobby.winningLevel) {
        lobby.state = "won";
      } else {
        lobby.currentLevel += 1;
        dealCards(lobby);
        assignRewards(lobby);
      }
    }

    return true;
  }

  lobby.lives -= 1;
  const lowerCards = allCards.filter((card) => card <= playedCard);
  lobby.discardPile.push(...lowerCards);
  lobby.players.forEach((player) => {
    player.hand = player.hand.filter((card) => card > playedCard);
  });
  return false;
}

export function useShuriken(lobby: Lobby): boolean {
  if (lobby.shurikens <= 0) {
    return false;
  }
  const cardsToAdd = [];
  for (const player of lobby.players) {
    if (player.hand.length > 0) {
      const lowestCard = Math.min(...player.hand);
      cardsToAdd.push(lowestCard);
      player.hand = player.hand.filter((card) => card !== lowestCard);
    }
  }
  if (cardsToAdd.length === 0) {
    return false;
  }
  lobby.shurikens -= 1;
  lobby.discardPile.push(...cardsToAdd);


  return true;
}

export function startGame(lobby: Lobby): boolean {
  if (lobby.state === "playing") {
    return false;
  }

  lobby.state = "playing";
  lobby.lives = lobby.players.length <= 4 ? lobby.players.length : 4;
  lobby.shurikens = 1;
  lobby.currentLevel = 1;
  lobby.discardPile = [];
  switch (lobby.players.length) {
    case 2: lobby.winningLevel = 12; break;
    case 3: lobby.winningLevel = 10; break;
    case 4: lobby.winningLevel = 8; break;
    default: lobby.winningLevel = 8; break;
  }
  dealCards(lobby);
  return true;
}

export function dealCards(lobby: Lobby) {
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

export function assignRewards(lobby: Lobby) {
    if ([2, 5, 8].includes(lobby.currentLevel)) {
      lobby.shurikens = Math.min(lobby.shurikens + 1, 3);
    } else if ([3, 6, 9].includes(lobby.currentLevel)) {
      lobby.lives = Math.min(lobby.lives + 1, 5);
    }
}