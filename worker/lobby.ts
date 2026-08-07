import type { Player } from "./game/player.ts";
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

// Given the name of the player, create a new player and add them to the lobby.
// If the lobby has no host, make this player the host.
export function addPlayer(lobby: Lobby, playerName: string): Player {
  const playerId = crypto.randomUUID();
  const newPlayer: Player = { id: playerId, name: playerName, hand: [] };
  lobby.players.push(newPlayer);

  if (!lobby.hostPlayerId) {
    lobby.hostPlayerId = playerId;
  }

  return newPlayer;
}

// Remove a player from the lobby by their ID. If the player is the host,
// assign a new host from the remaining players, otherwise set to null.
export function removePlayer(lobby: Lobby, playerId: string) {
  lobby.players = lobby.players.filter((player) => player.id !== playerId);

  if (lobby.hostPlayerId === playerId) {
    lobby.hostPlayerId = lobby.players[0]?.id ?? null;
  }
}

// Let the lobby react if the played card is the lowest card in the game.
// If it is, remove the card from all players' hands and add it to the discard pile.
// When all players have no cards left, the level is completed and the game progresses to the next level.
// If the played card is not the lowest, remove all cards lower than or equal to the played card from all players' hands and add them to the discard pile.
export function playCard(lobby: Lobby, playedCard: number): boolean {
  const allCards = lobby.players.flatMap((player) => player.hand);
  const minCard = Math.min(...allCards);

  if (playedCard === minCard) {
    lobby.players.forEach((player) => {
      player.hand = player.hand.filter((card: number) => card !== playedCard);
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
  let lowerCards = allCards.filter((card) => card <= playedCard);
  if (lowerCards.length === allCards.length) {
    // Don't consider the played card if it would be the last one to be played to complete the level. 
    // This makes it easier to handle the event of level completion without overlapping two animations (the one for playing the wrong card and the one for completing the level).
    lowerCards = lowerCards.filter((card) => card !== playedCard);
  }
  lobby.discardPile.push(...lowerCards);
  lobby.players.forEach((player) => {
    player.hand = player.hand.filter((card: number) => !lowerCards.includes(card));
  });
  return false;
}

// Initialize game
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

// Assign cards to players based on the current level.
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

// Assign rewards to the lobby based on the current level
export function assignRewards(lobby: Lobby) {
    if ([2, 5, 8].includes(lobby.currentLevel)) {
      lobby.shurikens = Math.min(lobby.shurikens + 1, 3);
    } else if ([3, 6, 9].includes(lobby.currentLevel)) {
      lobby.lives = Math.min(lobby.lives + 1, 5);
    }
}