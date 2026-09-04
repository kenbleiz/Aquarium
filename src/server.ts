import express from "express";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import { Aquarium } from "./aquarium.js";
import { handleChat } from "./commands.js";
import { config } from "./config.js";
import { loadState, saveState } from "./persist.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const overlayDir = path.resolve(__dirname, "../overlay");

export async function createApp(): Promise<{
  server: ReturnType<typeof createServer>;
  game: Aquarium;
  startLoop: () => void;
}> {
  const game = new Aquarium({
    width: config.width,
    height: config.height,
    dayLength: config.dayLength,
    persistPath: config.dataPath,
  });

  const saved = await loadState(config.dataPath);
  if (saved) game.restore(saved);
  else game.seedWorld();

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use((_req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
  });

  app.use(express.static(overlayDir));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, fish: game.fish.length, twitch: game.twitchLive, time: game.time });
  });

  app.get("/api/state", (_req, res) => {
    res.json({
      snapshot: game.snapshot(),
      fish: game.fish.map((f) => ({
        id: f.id,
        name: f.name,
        owner: f.owner,
        rarity: f.rarity,
        species: f.species,
      })),
      viewers: [...game.viewers.values()].map((v) => ({
        username: v.username,
        coins: v.coins,
        fishId: v.fishId,
      })),
      event: game.event,
    });
  });

  app.post("/api/chat", (req, res) => {
    const user = String(req.body?.user ?? req.body?.username ?? "Debug").slice(0, 25);
    const message = String(req.body?.message ?? req.body?.text ?? "");
    const result = handleChat(game, user, message);
    res.json({ ...result, snapshot: game.snapshot() });
  });

  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: "state", data: game.snapshot() }));
    ws.on("close", () => clients.delete(ws));
    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string; user?: string; message?: string };
        if (msg.type === "chat" && msg.message) {
          const result = handleChat(game, String(msg.user || "Debug"), String(msg.message));
          ws.send(JSON.stringify({ type: "reply", data: result }));
        }
      } catch {
        /* ignore */
      }
    });
  });

  let dirty = false;
  const mark = (): void => {
    dirty = true;
  };
  const origAction = game.action.bind(game);
  game.action = (text: string) => {
    origAction(text);
    mark();
  };

  let loop: ReturnType<typeof setInterval> | undefined;
  let saver: ReturnType<typeof setInterval> | undefined;

  const startLoop = (): void => {
    const dt = 1 / Math.max(4, config.fps);
    loop = setInterval(() => {
      game.tick(dt);
      if (clients.size === 0) return;
      const payload = JSON.stringify({ type: "state", data: game.snapshot() });
      for (const c of clients) {
        if (c.readyState === 1) c.send(payload);
      }
    }, dt * 1000);

    saver = setInterval(() => {
      if (!dirty && game.tickCount % 60 !== 0) return;
      dirty = false;
      void saveState(config.dataPath, game.toPersist()).catch((err) => {
        console.error("[persist]", err);
      });
    }, 5000);
  };

  const shutdown = async (): Promise<void> => {
    if (loop) clearInterval(loop);
    if (saver) clearInterval(saver);
    await saveState(config.dataPath, game.toPersist()).catch(() => undefined);
  };
  process.on("SIGINT", () => {
    void shutdown().then(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown().then(() => process.exit(0));
  });

  return { server, game, startLoop };
}
