import tmi from "tmi.js";
import { Aquarium } from "./aquarium.js";
import { handleChat } from "./commands.js";
import { config, twitchConfigured } from "./config.js";

export function startTwitchBot(game: Aquarium): tmi.Client | null {
  if (!twitchConfigured()) {
    console.log("[twitch] Dry-run : pas de TWITCH_USERNAME / TOKEN / CHANNEL — overlay autonome OK.");
    console.log("[twitch] Debug local : POST /api/chat  { \"user\": \"Alice\", \"message\": \"!fish\" }");
    game.twitchLive = false;
    return null;
  }

  let token = config.twitchToken;
  if (!token.startsWith("oauth:")) token = `oauth:${token}`;

  const client = new tmi.Client({
    options: { debug: false },
    identity: { username: config.twitchUsername, password: token },
    channels: [config.twitchChannel],
  });

  client.on("connected", () => {
    game.twitchLive = true;
    console.log(`[twitch] Connecté à #${config.twitchChannel} en tant que ${config.twitchUsername}`);
  });

  client.on("disconnected", (reason) => {
    game.twitchLive = false;
    console.warn("[twitch] Déconnecté:", reason);
  });

  client.on("message", (channel, tags, message, self) => {
    if (self) return;
    const user = tags["display-name"] || tags.username || "viewer";
    const result = handleChat(game, user, message);
    if (result.reply) {
      void client.say(channel, result.reply);
    }
  });

  client.on("subscription", (channel, username) => {
    const msg = game.onSub(username);
    void client.say(channel, msg);
  });

  client.on("resub", (channel, username) => {
    const msg = game.onSub(username);
    void client.say(channel, msg);
  });

  client.on("cheer", (channel, userstate) => {
    const bits = Number(userstate.bits ?? 0);
    const name = userstate["display-name"] || userstate.username || "cheer";
    void client.say(channel, game.onBits(name, bits));
  });

  void client.connect().catch((err: unknown) => {
    game.twitchLive = false;
    console.error("[twitch] Échec connexion — on continue en dry-run.", err);
  });

  return client;
}
