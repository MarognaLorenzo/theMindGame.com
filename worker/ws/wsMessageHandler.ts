import { LobbyServer } from "../index.ts";

export abstract class WsMessageHandler {
    abstract type: string;
    abstract handleMessage: (ws: WebSocket, lobbyServer: LobbyServer) => Promise<void>;
}