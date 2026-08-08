const DISCONNECT_GRACE_MS = 120_000;

const PENDING_DISCONNECTS_KEY = "pending-disconnects";

type PendingDisconnects = Map<string, number>;

export class PendingDisconnectionsManager {
    private storage: DurableObjectStorage;
    private initialized = false;

    private pendingDisconnects: PendingDisconnects = new Map();
    constructor(storage: DurableObjectStorage) {
        this.storage = storage;
    }
    public async store() {
        await this.storage.put(PENDING_DISCONNECTS_KEY, Object.fromEntries(this.pendingDisconnects));
        this.initialized = true;
    }

    public async load() {
        if (this.initialized) {
            return;
        }
        const pendingDisconnectsObj = await this.storage.get<Record<string, number>>(PENDING_DISCONNECTS_KEY) ?? {};
        this.pendingDisconnects = new Map(Object.entries(pendingDisconnectsObj));
        this.initialized = true;
    }

    public getNextExpirationTime(): number | null {
        if (this.pendingDisconnects.size === 0) {
            return null;
        }
        return Math.min(...this.pendingDisconnects.values());
    }

    public setDisconnectDeadlineForPlayer(playerId: string){
        this.load();
        this.pendingDisconnects.set(playerId, Date.now() + DISCONNECT_GRACE_MS);
        this.store();
        this.resetAlarm();
    }

    public clearDisconnectDeadlineForPlayer(playerId: string){
        this.load();
        this.pendingDisconnects.delete(playerId);
        this.store();
        this.resetAlarm();
    }

    public async resetAlarm(){
        const nextExpiration = this.getNextExpirationTime();
        if (nextExpiration) {
            await this.storage.setAlarm(nextExpiration);
        } else {
            await this.storage.deleteAlarm();
        }
    }

    public playersToDisconnect(): string[] {
        const now = Date.now();
        const players = Array.from(this.pendingDisconnects.entries())
            .filter(([_, expiry]) => expiry <= now)
            .map(([playerId, _]) => playerId);
        for (const playerId of players) {
            this.pendingDisconnects.delete(playerId);
        }
        this.store();
        this.resetAlarm();
        return players;
    }
}