import { DurableObject } from "cloudflare:workers";

export class LobbyRegistry extends DurableObject {
  public async tryInsert(shortCode: string, lobbyDOId: string): Promise<boolean> {
    if (!shortCode || !lobbyDOId) {
      return false;
    }

    const exsistingDOId = await this.ctx.storage.get<string>(shortCode);
    if (exsistingDOId && exsistingDOId !== lobbyDOId) {
      return false;
    }

    await this.ctx.storage.put(shortCode, lobbyDOId);
    return true;
  }

  public async getValue(shortCode: string): Promise<string | null> {
    const lobbyDOId = await this.ctx.storage.get<string>(shortCode);
    return lobbyDOId ?? null;
  }
}
