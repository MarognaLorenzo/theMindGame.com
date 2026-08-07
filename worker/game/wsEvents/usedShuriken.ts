
    
// The lobby uses a shuriken. If the operation is not possible, return false. 
// Otherwise, remove the lowest card from each player's hand and add it to the discard pile.

import { LobbyServer } from "@/worker";
import { Lobby } from "@/worker/lobby";

// If all players have only one card, remove all cards from all players' hands except for the highest card.
export function useShuriken(lobbyServer: LobbyServer): boolean {
  const lobby = lobbyServer.lobby;
  
  if (lobby.shurikens <= 0) {
    return false;
  }
  const cardsToAdd: number[] = [];
  if (lobby.players.some((player) => player.hand.length > 1)) {

    for (const player of lobby.players) {
      if (player.hand.length > 0) {
        const lowestCard = Math.min(...player.hand);
        cardsToAdd.push(lowestCard);
      }
    }
  } else {
    const maxCard = Math.max(...lobby.players.flatMap((player) => player.hand));
    for (const player of lobby.players) {
      if (!player.hand.includes(maxCard)) {
        cardsToAdd.push(...player.hand)
      }
    }
  } 
  if (cardsToAdd.length === 0) {
    return false;
  }
  
  for (const player of lobby.players) {
    player.hand = player.hand.filter((card: number) => !cardsToAdd.includes(card));
  }
  lobby.shurikens -= 1;
  lobby.discardPile.push(...cardsToAdd);
  return true;
}