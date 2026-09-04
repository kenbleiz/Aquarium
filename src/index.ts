import { startTwitchBot } from "./bot.js";
import { config } from "./config.js";
import { createApp } from "./server.js";

const { server, game, startLoop } = await createApp();
startLoop();
startTwitchBot(game);

server.listen(config.port, config.host, () => {
  const url = `http://127.0.0.1:${config.port}/`;
  console.log(`[aquarium] Overlay OBS : ${url}`);
  console.log(`[aquarium] Debug chat  : ${url}debug.html`);
  console.log(`[aquarium] Health      : ${url}health`);
  console.log(`[aquarium] ${game.fish.length} poissons · ${game.w}x${game.h} · ${config.fps} FPS`);
});
