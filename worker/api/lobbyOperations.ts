import { Env, LobbyRegistry } from "../index.ts";
import { Responder } from "./utils/responder.ts";
import { generateShortCode } from "./utils/shortCodeLib.ts";

export async function createLobby(
  registryStub: DurableObjectStub<LobbyRegistry>,
  env: Env,
  responder: Responder): Promise<Response>
  {
      const lobbyServerDOId = env.LOBBY_SERVER.newUniqueId().toString();

      let candidateCode = generateShortCode();
      while (!await registryStub.tryInsert(candidateCode, lobbyServerDOId)) {
        candidateCode = generateShortCode();
      }
      return responder.respondWithJson({ lobbyId: candidateCode });
    }

export async function joinLobby(
  registryStub: DurableObjectStub<LobbyRegistry>,
  request: Request,
  env: Env,
  responder: Responder): Promise<Response>
  {
      const url = new URL(request.url);
      const shortCode = url.searchParams.get("lobbyId");

      if (!shortCode) {
        return responder.respondMissingField("lobbyId");
      }

      const insertedName = url.searchParams.get("name");
      if (!insertedName) {
        return responder.respondMissingField("name");
      }

      let lobbyDOId = await registryStub.getValue(shortCode);
      if (!lobbyDOId) {
        return responder.respondWithError(`Lobby with ID ${shortCode} not found`, 404);
      }

        const lobbyStub = env.LOBBY_SERVER.get(env.LOBBY_SERVER.idFromString(lobbyDOId));
      console.log(`\n\n\nJoining lobby with ID ${shortCode} and name ${insertedName}\n\n\n`);
        const res =  await lobbyStub.playerFirstTimeAccess(insertedName);
        console.log(`\n\n\nResponse from playerFirstTimeAccess: ${res.status} ${res.statusText}\n\n\n`);
        return res;
  }