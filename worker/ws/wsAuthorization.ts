import type { Room } from "../game/room.ts";
import { readPlayerAttachment } from "./wsUtils.ts";

export interface WsAuthResult {
  isValid: boolean;
  errorMessage?: string;
}

export function hasValidAttachment(ws: WebSocket): WsAuthResult {
    const attachment = readPlayerAttachment(ws);
    const isValid = !!attachment?.playerId && !!attachment?.playerName;

    if (!isValid) {
        return {
            isValid: false,
            errorMessage: "Invalid player attachment.",
        };
    }

    return { isValid: true };
}

export function isInGame(ws: WebSocket, room: Room): WsAuthResult {
    const attachmentResult = hasValidAttachment(ws);
    if (!attachmentResult.isValid) {
        return attachmentResult;
    }
    const playerId = readPlayerAttachment(ws)?.playerId;
    const isInGame = room.players.some((player) => player.id === playerId);
    if (!isInGame) {
        return {
            isValid: false,
            errorMessage: "Player is not in the game.",
        };
    }
    return { isValid: true };
}

export function isHostWs(ws: WebSocket, room: Room): WsAuthResult {
    const isInGameResult = isInGame(ws, room);
    if (!isInGameResult.isValid) {
        return isInGameResult;
    }
    const playerId = readPlayerAttachment(ws)?.playerId;
    const isHost = playerId === room.hostPlayerId;
    if (!isHost) {
        return {
            isValid: false,
            errorMessage: "Player is not the host.",
        };
    }
    return { isValid: true };
}

export function ownsCard(ws: WebSocket, room: Room, card: number): WsAuthResult {
    const isInGameResult = isInGame(ws, room);
    if (!isInGameResult.isValid) {
        return isInGameResult;
    }
    const playerId = readPlayerAttachment(ws)?.playerId ?? "NotExistingPlayer"; // Impossible to reach due to isInGame check, but TypeScript needs this fallback
    const ownsCard = room.playerHasCard(playerId, card);
    if (!ownsCard) {
        return {
            isValid: false,
            errorMessage: "Player does not own that card.",
        };
    }
    return { isValid: true };
}