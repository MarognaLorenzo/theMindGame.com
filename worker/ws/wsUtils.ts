import { Player } from "../game/player";
import { Room } from "../game/room";

export interface PlayerAttachment {
  playerId: string;
  playerName: string;
}

// This file handles reading and writing player attachments to WebSockets,
// which allows us to associate a WebSocket connection with a specific player in the lobby.
// This is crucial for maintaining player state across disconnections and reconnection.
export function readPlayerAttachment(ws: WebSocket): PlayerAttachment | null {
  const attachment = ws.deserializeAttachment() as PlayerAttachment | null;
  if (!attachment?.playerId || !attachment?.playerName) {
    return null;
  }

  return attachment;
}

export function writePlayerAttachment(
  ws: WebSocket,
  attachment: PlayerAttachment,
) {
  ws.serializeAttachment(attachment);
}

export function wsSendError(ws: WebSocket, message: string) {
    ws.send(
        JSON.stringify({
            type: "ERROR",
            message,
        })
    );
}

function getAttachmentIds(sockets: WebSocket[]): Set<string> {
    const ids = new Set<string>();
    for (const ws of sockets) {
        const attachment = readPlayerAttachment(ws);
        if (attachment) {
            ids.add(attachment.playerId);
        }
    }
    return ids;
}

function filterPlayersWithoutSockets(room: Room, sockets: WebSocket[]) {
    const attachmentIds = getAttachmentIds(sockets);
    room.players = room.players.filter((player) =>
        attachmentIds.has(player.id)
    );
}

function addMissingPlayersFromSockets(room: Room, sockets: WebSocket[]) {
    const attachmentIds = getAttachmentIds(sockets);
    for (const ws of sockets) {
        const attachment = readPlayerAttachment(ws);
        if (!attachment) {
            continue;
        }
        if (!room.players.some((player) => player.id === attachment.playerId)) {
            room.players.push(
                new Player(attachment.playerId, attachment.playerName, []),
            );
        }
    }
}

// Reconcile the list of players in the lobby with the list of connected WebSockets.
// If a WebSocket has a player attachment, ensure that the player is in the lobby. If it's not, add them.
// If a player in the lobby does not have a corresponding WebSocket, remove them from the lobby.
export function reconcilePlayersFromSockets(room: Room, sockets: WebSocket[]) {
  addMissingPlayersFromSockets(room, sockets);
  filterPlayersWithoutSockets(room, sockets);
  room.restoreHostPlayerId();
}