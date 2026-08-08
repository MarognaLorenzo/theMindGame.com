import { Room } from "../game/room";
import { LobbyServer } from "../lobbyServerDO";

type PlayerId = string;
type RT = string;
const PLAYER2ID_MAP_KEY = "player2id-map";
const ID2PLAYER_MAP_KEY = "id2player-map";

export class ResumeTokenManager {
    initialized = false;
    private token2PlayerIdMap: Map<RT, PlayerId> = new Map();
    private PlayerId2TokenMap: Map<PlayerId, RT> = new Map();
    private storage;

    constructor(storage: DurableObjectStorage) {
        this.storage = storage;
    }

    public async storeMap() {
        await this.storage.put(PLAYER2ID_MAP_KEY, Object.fromEntries(this.token2PlayerIdMap));
        await this.storage.put(ID2PLAYER_MAP_KEY, Object.fromEntries(this.PlayerId2TokenMap));
        this.initialized = true;
    }

    public async load() {
        if (this.initialized) {
            return;
        }
        const token2PlayerIdObj = await this.storage.get<Record<RT, PlayerId>>(PLAYER2ID_MAP_KEY) ?? {};
        const playerId2TokenObj = await this.storage.get<Record<PlayerId, RT>>(ID2PLAYER_MAP_KEY) ?? {};
        this.token2PlayerIdMap = new Map(Object.entries(token2PlayerIdObj));
        this.PlayerId2TokenMap = new Map(Object.entries(playerId2TokenObj));
        this.initialized = true;
    }

    public tryGetTokenFromPlayerId(
      playerId: string,
    ): string | null {
        return this.PlayerId2TokenMap.get(playerId) ?? null;
    }

    public tryGetPlayerIdFromToken(
      token: string,
    ): string | null {
        return this.token2PlayerIdMap.get(token) ?? null;
    }

    // Return true if some entries were removed, false otherwise
    public filterOutEntriesOfPlayersNotInRoom(room: Room): boolean {
        let somethingRemoved: boolean = false;
        const validPlayerIds = new Set(room.players.map((p) => p.id));
        for (const [playerId, token] of this.PlayerId2TokenMap.entries()) {
            if (!validPlayerIds.has(playerId)) {
                this.PlayerId2TokenMap.delete(playerId);
                this.token2PlayerIdMap.delete(token);
                somethingRemoved = true;
            }
        }
        return somethingRemoved;
    }

    // Create a new token for the player, replacing any existing token for that player.
    public assignNewTokenToPlayer(playerId: string): string {
        const newToken = crypto.randomUUID();
        if(this.PlayerId2TokenMap.has(playerId)) {
            const oldToken = this.PlayerId2TokenMap.get(playerId) as string;
            this.token2PlayerIdMap.delete(oldToken);
            this.PlayerId2TokenMap.delete(playerId);
        }
        this.token2PlayerIdMap.set(newToken, playerId);
        this.PlayerId2TokenMap.set(playerId, newToken);
        return newToken;
    }

    public deleteTokenForPlayer(playerId: string): boolean {
        if (!this.PlayerId2TokenMap.has(playerId)) {
            return false;
        }
        const token = this.PlayerId2TokenMap.get(playerId) as string;
        this.PlayerId2TokenMap.delete(playerId);
        this.token2PlayerIdMap.delete(token);
        return true;
    }
}
