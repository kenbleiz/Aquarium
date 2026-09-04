import "dotenv/config";
import path from "node:path";

function num(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const config = {
  port: num("PORT", 3000),
  host: process.env.HOST ?? "0.0.0.0",
  twitchUsername: process.env.TWITCH_USERNAME?.trim() || "",
  twitchToken: process.env.TWITCH_OAUTH_TOKEN?.trim() || "",
  twitchChannel: process.env.TWITCH_CHANNEL?.trim().replace(/^#/, "") || "",
  width: num("AQUARIUM_WIDTH", 96),
  height: num("AQUARIUM_HEIGHT", 28),
  fps: num("TICK_FPS", 12),
  dayLength: num("DAY_LENGTH_SEC", 480),
  dataPath: path.resolve(process.env.DATA_PATH ?? "./data/aquarium.json"),
};

export function twitchConfigured(): boolean {
  return Boolean(config.twitchUsername && config.twitchToken && config.twitchChannel);
}
