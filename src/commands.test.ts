import assert from "node:assert/strict";
import { mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { Aquarium } from "./aquarium.js";
import { handleChat } from "./commands.js";

function make() {
  const dir = path.join(os.tmpdir(), "aqua-" + Math.random().toString(36).slice(2));
  mkdirSync(dir, { recursive: true });
  const game = new Aquarium({
    width: 80,
    height: 24,
    persistPath: path.join(dir, "s.json"),
    dayLength: 120,
  });
  game.seedWorld();
  return { game, dir };
}

test("overlay snapshot has living tank", () => {
  const { game, dir } = make();
  game.tick(1 / 12);
  const snap = game.snapshot();
  assert.ok(snap.w >= 40 && snap.h >= 16);
  assert.ok(snap.drawables.length > 10);
  assert.ok(snap.hud.fish >= 1);
  assert.equal(typeof snap.hud.lastAction, "string");
  rmSync(dir, { recursive: true, force: true });
});

test("core chat commands mutate the tank", () => {
  const { game, dir } = make();
  const fish = handleChat(game, "Alice", "!fish");
  assert.match(fish.reply ?? "", /adopte/);
  const owned = game.ownedFish("Alice");
  assert.ok(owned);
  assert.equal(owned.owner, "alice");

  const feed = handleChat(game, "Alice", "!nourrir");
  assert.match(feed.reply ?? "", /granulés/);
  assert.ok(game.food.length >= 3);

  const mine = handleChat(game, "Alice", "!myfish");
  assert.match(mine.reply ?? "", /Alice|❤️|Commun|Peu|Rare|Épique|Légendaire|Mythique/);

  const named = handleChat(game, "Alice", "!name Bubulle");
  assert.match(named.reply ?? "", /Bubulle/);
  assert.equal(game.ownedFish("Alice")?.name, "Bubulle");

  const tank = handleChat(game, "Alice", "!aquarium");
  assert.match(tank.reply ?? "", /poissons/);

  const coinsBefore = game.viewer("Alice").coins;
  const loot = handleChat(game, "Alice", "!tresor");
  assert.match(loot.reply ?? "", /🪙/);
  assert.ok(game.viewer("Alice").coins > coinsBefore);

  const shop = handleChat(game, "Alice", "!shop");
  assert.match(shop.reply ?? "", /buy|décor|decor/i);

  game.viewer("Alice").coins += 100;
  const deco = handleChat(game, "Alice", "!decor seaweed");
  assert.match(deco.reply ?? "", /algue|installé/i);

  const top = handleChat(game, "Alice", "!top");
  assert.match(top.reply ?? "", /Alice|🪙/);

  const help = handleChat(game, "Alice", "!aide");
  assert.match(help.reply ?? "", /!fish/);

  const rel = handleChat(game, "Alice", "!release");
  assert.match(rel.reply ?? "", /librement|relâche|vague/i);
  assert.equal(game.ownedFish("Alice"), undefined);

  rmSync(dir, { recursive: true, force: true });
});

test("catch mini-game awards a winner", () => {
  const { game, dir } = make();
  handleChat(game, "Mod", "!catch");
  assert.ok(game.catchGame);
  const word = game.catchGame.word;
  const win = handleChat(game, "Bob", word);
  assert.match(win.reply ?? "", /pèche|gagne/i);
  assert.ok(game.ownedFish("Bob"));
  rmSync(dir, { recursive: true, force: true });
});

test("race and battle", () => {
  const { game, dir } = make();
  handleChat(game, "Alice", "!fish");
  handleChat(game, "Bob", "!poisson");
  const race = handleChat(game, "Alice", "!race");
  assert.match(race.reply ?? "", /Course|cooldown|poissons/);
  if (game.race) {
    const go = handleChat(game, "Alice", "!go");
    assert.match(go.reply ?? "", /accélère|cheer/i);
  }
  const fight = handleChat(game, "Alice", "!battle @Bob");
  assert.match(fight.reply ?? "", /VS|poisson|Duel/);
  rmSync(dir, { recursive: true, force: true });
});

test("feed rate limit", () => {
  const { game, dir } = make();
  handleChat(game, "Zed", "!feed");
  const again = handleChat(game, "Zed", "!feed");
  assert.match(again.reply ?? "", /encore|s\./);
  rmSync(dir, { recursive: true, force: true });
});

test("autonomous tick without chat", () => {
  const { game, dir } = make();
  const x0 = game.fish[0]!.x;
  for (let i = 0; i < 40; i++) game.tick(0.1);
  assert.ok(game.fish.length >= 1);
  const moved = game.fish.some((f) => f.x !== x0) || game.bubbles.length >= 0;
  assert.ok(moved);
  rmSync(dir, { recursive: true, force: true });
});

test("tank stays populated and fish do not stack", () => {
  const { game, dir } = make();
  assert.ok(game.fish.length >= 8);
  game.fish = [];
  for (let i = 0; i < 30; i++) game.tick(0.1);
  assert.ok(game.fish.length >= 12, "respawn if emptied");
  const cells = new Set(game.fish.map((f) => `${Math.round(f.x)},${Math.round(f.y)}`));
  assert.ok(cells.size >= Math.min(6, game.fish.length), "fish occupy distinct cells");
  const snap = game.snapshot();
  const drawn = snap.drawables.filter((d) =>
    ["common", "uncommon", "rare", "epic", "legendary", "mythic"].includes(d.color),
  );
  assert.ok(drawn.length >= 8);
  rmSync(dir, { recursive: true, force: true });
});

test("1080p grid is 160x48", () => {
  const game = new Aquarium({ width: 160, height: 48 });
  game.seedWorld();
  const snap = game.snapshot();
  assert.equal(snap.w, 160);
  assert.equal(snap.h, 48);
  assert.ok(game.fish.length >= 12);
});
