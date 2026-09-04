import { Aquarium } from "./aquarium.js";

export interface ChatResult {
  reply: string | null;
  handled: boolean;
}

const ALIASES: Record<string, string> = {
  fish: "fish",
  poisson: "fish",
  adopter: "fish",
  adopt: "fish",
  feed: "feed",
  nourrir: "feed",
  food: "feed",
  miam: "feed",
  granulés: "feed",
  granules: "feed",
  aquarium: "aquarium",
  tank: "aquarium",
  bac: "aquarium",
  status: "aquarium",
  myfish: "myfish",
  monpoisson: "myfish",
  moi: "myfish",
  name: "name",
  nom: "name",
  rename: "name",
  release: "release",
  relacher: "release",
  relâche: "release",
  free: "release",
  catch: "catch",
  peche: "catch",
  pêche: "catch",
  attrape: "catch",
  race: "race",
  course: "race",
  go: "go",
  allez: "go",
  cheer: "go",
  battle: "battle",
  duel: "battle",
  combat: "battle",
  treasure: "treasure",
  tresor: "treasure",
  trésor: "treasure",
  dig: "treasure",
  creuser: "treasure",
  shop: "shop",
  boutique: "shop",
  buy: "buy",
  acheter: "buy",
  decor: "decor",
  deco: "decor",
  décor: "decor",
  top: "top",
  classement: "top",
  leaderboard: "top",
  help: "help",
  aide: "help",
  commandes: "help",
  commands: "help",
  coins: "coins",
  or: "coins",
  gold: "coins",
  pieces: "coins",
  pièces: "coins",
};

function normCmd(raw: string): string {
  return raw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function handleChat(game: Aquarium, user: string, message: string): ChatResult {
  const text = message.trim();
  if (!text) return { reply: null, handled: false };
  game.lastChatAt = game.time;

  const caught = game.tryCatch(user, text);
  if (caught) return { reply: caught, handled: true };

  if (!text.startsWith("!")) return { reply: null, handled: false };

  const parts = text.slice(1).split(/\s+/);
  const cmd = ALIASES[normCmd(parts[0] ?? "")];
  if (!cmd) return { reply: null, handled: false };

  const arg = parts.slice(1).join(" ").trim();

  switch (cmd) {
    case "fish":
      return { reply: game.adopt(user), handled: true };
    case "feed":
      return { reply: game.feed(user), handled: true };
    case "aquarium":
      return { reply: game.status(), handled: true };
    case "myfish":
      return { reply: game.myFish(user), handled: true };
    case "name":
      return { reply: game.rename(user, arg), handled: true };
    case "release":
      return { reply: game.release(user), handled: true };
    case "catch":
      return { reply: game.startCatch(user), handled: true };
    case "race":
      return { reply: game.startRace(user), handled: true };
    case "go":
      return { reply: game.cheer(user), handled: true };
    case "battle":
      return { reply: game.battle(user, arg.split(/\s+/)[0] ?? ""), handled: true };
    case "treasure":
      return { reply: game.treasure(user), handled: true };
    case "shop":
      return { reply: game.shopList(), handled: true };
    case "buy":
      return { reply: game.buy(user, arg.split(/\s+/)[0] ?? ""), handled: true };
    case "decor":
      return { reply: game.placeDecor(user, arg.split(/\s+/)[0] ?? ""), handled: true };
    case "top":
      return { reply: game.top(arg || "coins"), handled: true };
    case "help":
      return { reply: game.help(), handled: true };
    case "coins":
      return { reply: game.coins(user), handled: true };
    default:
      return { reply: null, handled: false };
  }
}
