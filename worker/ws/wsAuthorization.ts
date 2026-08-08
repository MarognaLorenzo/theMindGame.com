import type { Room } from "../game/room.ts";
import { readPlayerAttachment } from "./wsUtils.ts";

export interface WsAuthResult {
  isValid: boolean;
  playerId?: string;
  playerName?: string;
  errorMessage?: string;
}

export function analyzeAttachment(ws: WebSocket): WsAuthResult {
    const attachment = readPlayerAttachment(ws);
    const isValid = !!attachment?.playerId && !!attachment?.playerName;

    if (!isValid) {
        return {
            isValid: false,
            errorMessage: "Invalid player attachment.",
        };
    }

    return { isValid: true , playerId: attachment.playerId, playerName: attachment.playerName};
}

export function isInGame(ws: WebSocket, room: Room): WsAuthResult {
    const attachmentResult = analyzeAttachment(ws);
    if (!attachmentResult.isValid) {
        return attachmentResult;
    }
    const playerId = attachmentResult.playerId;
    const isInGame = room.players.some((player) => player.id === playerId);
    if (!isInGame) {
        return {
            isValid: false,
            errorMessage: "Player is not in the game.",
        };
    }
    return { isValid: true , playerId: attachmentResult.playerId, playerName: attachmentResult.playerName};
}

export function isHostWs(ws: WebSocket, room: Room): WsAuthResult {
    const isInGameResult = isInGame(ws, room);
    if (!isInGameResult.isValid) {
        return isInGameResult;
    }
    const playerId = isInGameResult.playerId;
    const isHost = playerId === room.hostPlayerId;
    if (!isHost) {
        return {
            isValid: false,
            errorMessage: "Player is not the host.",
        };
    }
    return { isValid: true , playerId: isInGameResult.playerId, playerName: isInGameResult.playerName};
}

export function ownsCard(ws: WebSocket, room: Room, card: number): WsAuthResult {
    const isInGameResult = isInGame(ws, room);
    if (!isInGameResult.isValid) {
        return isInGameResult;
    }
    const playerId = isInGameResult.playerId??"";
    const ownsCard = room.playerHasCard(playerId, card);
    if (!ownsCard) {
        return {
            isValid: false,
            errorMessage: "Player does not own that card.",
        };
    }
    return { isValid: true , playerId: isInGameResult.playerId, playerName: isInGameResult.playerName};
}