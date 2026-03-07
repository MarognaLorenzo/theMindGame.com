import type { PlayerAttachment } from "./lobby";

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