import { readPlayerAttachment } from "./wsAttachmentUtils.ts";
import type { Lobby, Player } from "./lobby.ts";

// Reconcile the list of players in the lobby with the list of connected WebSockets.
// If a WebSocket has a player attachment, ensure that the player is in the lobby. If it's not, add them.
// If a player in the lobby does not have a corresponding WebSocket, remove them from the lobby.
export function reconcilePlayersFromSockets(lobby: Lobby, sockets: WebSocket[]) {
  const playersById = new Map<string, Player>(
    lobby.players.map((player) => [player.id, player]),
  );

  for (const ws of sockets) {
    const attachment = readPlayerAttachment(ws);
    if (!attachment) {
      continue;
    }

    const existing = playersById.get(attachment.playerId);
    playersById.set(
      attachment.playerId,
      existing ?? { id: attachment.playerId, name: attachment.playerName, hand: [] },
    );
  }

  lobby.players = Array.from(playersById.values());

  if (lobby.hostPlayerId && !lobby.players.some((p) => p.id === lobby.hostPlayerId)) {
    lobby.hostPlayerId = null;
  }

  if (!lobby.hostPlayerId && lobby.players.length > 0) {
    lobby.hostPlayerId = lobby.players[0].id;
  }
}

export function toLobbyStatePayload(lobby: Lobby) {
  return {
    ...lobby,
    players: lobby.players.map((p) => ({
      id: p.id,
      name: p.name,
      hand: p.hand,
      handSize: p.hand.length,
    })),
  };
}