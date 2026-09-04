import {
  CATCH_WORDS,
  DECOR_SHOP,
  RARITY_FR,
  RARITY_SCORE,
  SHOP,
  SPECIES,
  accessoryGlyph,
  crabArt,
  dayKey,
  decorArt,
  fishArt,
  irandName,
  piranhaArt,
  rollRarity,
  sharkArt,
  speciesForRarity,
} from "./catalog.js";
import { chance, clamp, dist, irand, pick, rand, uid } from "./rng.js";
import type {
  AccessoryId,
  CatchGame,
  Crab,
  Decor,
  DecorKind,
  EventKind,
  Fish,
  Food,
  PersistBlob,
  Phase,
  Predator,
  RaceState,
  Rarity,
  Snapshot,
  SpeciesId,
  TankEvent,
  Viewer,
} from "./types.js";

const MAX_FISH = 42;
const MAX_FOOD = 48;
const MAX_BUBBLES = 80;
const MAX_DECOR = 28;
const FEED_CD = 8;
const TREASURE_CD = 90;
const FISH_CD = 20;
const BATTLE_CD = 35;
const CATCH_CD = 55;
const RACE_CD = 90;
const EVENT_CD = 50;
const CATCH_DURATION = 16;
const RACE_DURATION = 18;

export interface AquariumOptions {
  width?: number;
  height?: number;
  dayLength?: number;
  persistPath?: string | null;
  now?: () => number;
}

export class Aquarium {
  w: number;
  h: number;
  dayLength: number;
  persistPath: string | null;
  nowFn: () => number;

  time = 0;
  tickCount = 0;
  lastTickAt = Date.now();
  fish: Fish[] = [];
  food: Food[] = [];
  bubbles: { id: string; x: number; y: number; speed: number; ch: string }[] = [];
  decors: Decor[] = [];
  predators: Predator[] = [];
  crabs: Crab[] = [];
  viewers = new Map<string, Viewer>();
  event: TankEvent | null = null;
  catchGame: CatchGame | null = null;
  race: RaceState | null = null;
  lastAction = "Le bac s'éveille… / The tank awakens…";
  lastChatAt = 0;
  lastCatchStart = -999;
  lastRaceStart = -999;
  lastEventAt = -30;
  lastAmbientFish = 0;
  twitchLive = false;
  battleBanner: string | null = null;
  battleBannerUntil = 0;

  constructor(opts: AquariumOptions = {}) {
    this.w = opts.width ?? 96;
    this.h = opts.height ?? 28;
    this.dayLength = opts.dayLength ?? 480;
    this.persistPath = opts.persistPath ?? null;
    this.nowFn = opts.now ?? (() => Date.now());
    this.time = this.dayLength * 0.28;
  }

  waterTop(): number {
    return 1;
  }

  floorY(): number {
    return this.h - 2;
  }

  phase(): Phase {
    const t = (this.time / this.dayLength) % 1;
    if (t < 0.08 || t > 0.92) return "night";
    if (t < 0.16) return "dawn";
    if (t > 0.84) return "dusk";
    return "day";
  }

  timeOfDay(): number {
    return (this.time / this.dayLength) % 1;
  }

  restore(blob: PersistBlob): void {
    this.time = blob.time ?? 0;
    this.tickCount = blob.tickCount ?? 0;
    this.fish = blob.fish ?? [];
    this.decors = blob.decors ?? [];
    this.crabs = blob.crabs ?? [];
    this.lastAction = blob.lastAction ?? this.lastAction;
    this.viewers = new Map((blob.viewers ?? []).map((v) => [v.username.toLowerCase(), v]));
    if (this.fish.length === 0) this.seedWorld();
    if (this.decors.length === 0) this.seedDecor();
    if (this.crabs.length === 0) this.crabs.push(this.makeCrab());
  }

  seedWorld(): void {
    this.seedDecor();
    this.crabs = [this.makeCrab()];
    for (let i = 0; i < 8; i++) this.spawnWild(i < 6 ? "common" : i === 6 ? "uncommon" : "rare");
    this.action("Des poissons sauvages explorent le bac.");
  }

  toPersist(): PersistBlob {
    return {
      version: 1,
      savedAt: Date.now(),
      time: this.time,
      tickCount: this.tickCount,
      fish: this.fish,
      decors: this.decors,
      crabs: this.crabs,
      viewers: [...this.viewers.values()],
      lastAction: this.lastAction,
    };
  }

  key(name: string): string {
    return name.trim().toLowerCase();
  }

  viewer(name: string): Viewer {
    const k = this.key(name);
    let v = this.viewers.get(k);
    if (!v) {
      v = {
        username: k,
        display: name,
        coins: 12,
        fishId: null,
        lastFeedAt: -999,
        lastTreasureAt: -999,
        lastFishAt: -999,
        lastBattleAt: -999,
        lastNameAt: -999,
        feedStreak: 0,
        lastFeedDay: "",
        accessories: [],
        badges: [],
        spawnedCount: 0,
        happiest: 0,
        aliveSeconds: 0,
      };
      this.viewers.set(k, v);
    } else {
      v.display = name;
    }
    return v;
  }

  ownedFish(name: string): Fish | undefined {
    const v = this.viewers.get(this.key(name));
    if (!v?.fishId) return undefined;
    return this.fish.find((f) => f.id === v.fishId);
  }

  action(text: string): void {
    this.lastAction = text;
  }

  makeFish(partial: Partial<Fish> & Pick<Fish, "name" | "species" | "rarity">): Fish {
    const speed = SPECIES[partial.species].speed;
    const facing: 1 | -1 = chance(0.5) ? 1 : -1;
    return {
      id: uid("f"),
      owner: null,
      ownerDisplay: null,
      x: rand(4, this.w - 6),
      y: rand(this.waterTop() + 2, this.floorY() - 3),
      vx: facing * speed * rand(0.4, 1),
      vy: rand(-0.2, 0.2),
      facing,
      hunger: irand(10, 40),
      happiness: irand(55, 85),
      age: 95,
      growth: 1,
      lastBreedAt: -999,
      accessory: null,
      retargetAt: this.time,
      targetX: rand(4, this.w - 6),
      targetY: rand(this.waterTop() + 2, this.floorY() - 3),
      spawnedBy: null,
      ...partial,
    };
  }

  spawnWild(rarity?: Rarity): Fish | null {
    if (this.fish.length >= MAX_FISH) return null;
    const r = rarity ?? rollRarity(-0.2);
    const species = speciesForRarity(r);
    const f = this.makeFish({ name: irandName(), species, rarity: r });
    this.fish.push(f);
    return f;
  }

  spawnOwned(display: string, luck = 0): Fish | null {
    if (this.fish.length >= MAX_FISH) return null;
    const r = rollRarity(luck);
    const species = speciesForRarity(r);
    const f = this.makeFish({
      name: display.slice(0, 14),
      species,
      rarity: r,
      owner: this.key(display),
      ownerDisplay: display,
      spawnedBy: this.key(display),
      happiness: 70,
      hunger: 25,
    });
    this.fish.push(f);
    return f;
  }

  makeCrab(): Crab {
    return { id: uid("c"), x: rand(2, this.w - 4), facing: chance(0.5) ? 1 : -1, vx: rand(0.25, 0.55) };
  }

  seedDecor(): void {
    const kinds: DecorKind[] = ["seaweed", "seaweed", "seaweed", "seaweed", "coral", "coral", "rock", "rock", "chest", "anemone"];
    this.decors = kinds.map((kind, i) => ({
      id: uid("d"),
      kind,
      x: 3 + i * Math.max(4, Math.floor((this.w - 10) / kinds.length)),
      y: this.floorY(),
      placedBy: null,
    }));
    this.decors.push({
      id: uid("d"),
      kind: "castle",
      x: Math.floor(this.w * 0.72),
      y: this.floorY(),
      placedBy: null,
    });
  }

  dropFood(n: number, x?: number): void {
    for (let i = 0; i < n && this.food.length < MAX_FOOD; i++) {
      this.food.push({
        id: uid("n"),
        x: x != null ? clamp(x + rand(-3, 3), 1, this.w - 2) : rand(2, this.w - 3),
        y: this.waterTop() + rand(0, 2),
        vy: rand(0.35, 0.7),
      });
    }
  }

  startEvent(kind: EventKind, startedBy: string | null, duration: number): void {
    const labels: Record<EventKind, [string, string]> = {
      feeding_frenzy: ["FRÉNÉSIE ALIMENTAIRE", "FEEDING FRENZY"],
      shark_attack: ["ALERTE REQUIN", "SHARK ATTACK"],
      bubble_storm: ["TEMPÊTE DE BULLES", "BUBBLE STORM"],
      golden_hour: ["HEURE DORÉE", "GOLDEN HOUR"],
      catch: ["PÊCHE ÉCLAIR", "CATCH"],
      race: ["COURSE DE POISSONS", "FISH RACE"],
    };
    const [labelFr, labelEn] = labels[kind];
    this.event = { kind, labelFr, labelEn, until: this.time + duration, startedBy };
    this.lastEventAt = this.time;
    this.action(`${labelFr} ! / ${labelEn}!`);
    if (kind === "feeding_frenzy") this.dropFood(18);
    if (kind === "shark_attack") this.spawnPredators();
    if (kind === "bubble_storm") this.spawnBubbles(40);
    if (kind === "golden_hour") {
      for (const f of this.fish) f.happiness = clamp(f.happiness + 12, 0, 100);
    }
  }

  spawnPredators(): void {
    this.predators.push({
      id: uid("p"),
      kind: "shark",
      x: 2,
      y: this.h * 0.45,
      vx: 0.9,
      facing: 1,
    });
    this.predators.push({
      id: uid("p"),
      kind: "piranha",
      x: this.w - 6,
      y: this.h * 0.3,
      vx: -1.1,
      facing: -1,
    });
    this.predators.push({
      id: uid("p"),
      kind: "piranha",
      x: this.w * 0.4,
      y: this.h * 0.6,
      vx: 1,
      facing: 1,
    });
  }

  spawnBubbles(n: number): void {
    for (let i = 0; i < n && this.bubbles.length < MAX_BUBBLES; i++) {
      this.bubbles.push({
        id: uid("b"),
        x: rand(1, this.w - 2),
        y: rand(this.floorY() - 4, this.floorY()),
        speed: rand(0.35, 1.1),
        ch: chance(0.25) ? "O" : chance(0.5) ? "o" : ".",
      });
    }
  }

  cdLeft(last: number, cd: number): number {
    return Math.max(0, Math.ceil(cd - (this.time - last)));
  }

  tick(dt: number): void {
    this.tickCount++;
    this.time += dt;
    const night = this.phase() === "night";
    const golden = this.event?.kind === "golden_hour";
    const frenzy = this.event?.kind === "feeding_frenzy";
    const storm = this.event?.kind === "bubble_storm";
    const speedMul = night ? 0.55 : golden ? 1.15 : 1;

    if (this.event && this.time >= this.event.until) {
      if (this.event.kind === "shark_attack") this.predators = [];
      if (this.event.kind === "race") this.finishRace();
      if (this.event.kind === "catch") this.catchGame = null;
      this.event = null;
    }
    if (this.catchGame && this.time >= this.catchGame.until) {
      this.action(`Personne n'a attrapé « ${this.catchGame.word} ».`);
      this.catchGame = null;
    }
    if (this.battleBanner && this.time >= this.battleBannerUntil) this.battleBanner = null;

    if (frenzy && this.tickCount % 8 === 0) this.dropFood(2);
    if (storm && this.tickCount % 4 === 0) this.spawnBubbles(6);
    if (this.tickCount % 10 === 0) this.spawnBubbles(night ? 1 : 2);
    if (this.food.length === 0 && chance(0.008)) this.dropFood(1);
    if (this.time - this.lastAmbientFish > 25 && this.fish.length < 10) {
      this.spawnWild();
      this.lastAmbientFish = this.time;
    }

    this.tickFood(dt);
    this.tickBubbles(dt);
    this.tickPredators(dt * speedMul);
    this.tickCrabs(dt);
    this.tickFish(dt, speedMul);
    this.maybeBreed();
    this.maybeAmbient();
    this.ageAndDeath(dt);

    if (this.race && !this.race.finished) this.tickRace(dt);
  }

  tickFood(dt: number): void {
    const floor = this.floorY();
    this.food = this.food.filter((fd) => {
      fd.y += fd.vy * dt * 6;
      if (fd.y >= floor) return false;
      const eater = this.fish.find((f) => dist(f.x, f.y, fd.x, fd.y) < 1.6);
      if (eater) {
        eater.hunger = clamp(eater.hunger - 32, 0, 100);
        eater.happiness = clamp(eater.happiness + (this.event?.kind === "golden_hour" ? 18 : 10), 0, 100);
        return false;
      }
      return true;
    });
  }

  tickBubbles(dt: number): void {
    this.bubbles = this.bubbles.filter((b) => {
      b.y -= b.speed * dt * 7;
      b.x += Math.sin(this.time * 2 + b.x) * dt * 0.6;
      return b.y > this.waterTop() - 1;
    });
    if (this.bubbles.length > MAX_BUBBLES) this.bubbles.length = MAX_BUBBLES;
  }

  tickPredators(dt: number): void {
    for (const p of this.predators) {
      p.x += p.vx * dt * 10;
      p.y += Math.sin(this.time * 1.4 + p.x) * dt * 1.2;
      p.y = clamp(p.y, this.waterTop() + 2, this.floorY() - 3);
      if (p.x > this.w - 4) {
        p.vx = -Math.abs(p.vx);
        p.facing = -1;
      }
      if (p.x < 2) {
        p.vx = Math.abs(p.vx);
        p.facing = 1;
      }
    }
  }

  tickCrabs(dt: number): void {
    for (const c of this.crabs) {
      c.x += c.facing * c.vx * dt * 6;
      if (c.x > this.w - 5) c.facing = -1;
      if (c.x < 2) c.facing = 1;
      if (chance(0.01)) c.facing = c.facing === 1 ? -1 : 1;
    }
  }

  tickFish(dt: number, speedMul: number): void {
    const school: Record<string, { x: number; y: number; vx: number; n: number }> = {};
    for (const f of this.fish) {
      if (!SPECIES[f.species].school) continue;
      const s = (school[f.species] ??= { x: 0, y: 0, vx: 0, n: 0 });
      s.x += f.x;
      s.y += f.y;
      s.vx += f.vx;
      s.n++;
    }

    for (const f of this.fish) {
      const spec = SPECIES[f.species];
      f.age += dt;
      f.hunger = clamp(f.hunger + dt * (this.event?.kind === "feeding_frenzy" ? 0.08 : 0.32), 0, 100);
      if (f.hunger > 70) f.happiness = clamp(f.happiness - dt * 1.4, 0, 100);
      else if (f.hunger < 35) f.happiness = clamp(f.happiness + dt * 0.35, 0, 100);
      if (this.event?.kind === "golden_hour") f.happiness = clamp(f.happiness + dt * 1.2, 0, 100);

      if (f.age > 90 && f.growth === 0) f.growth = 1;
      if (f.age > 280 && f.growth === 1) f.growth = 2;

      if (this.race && !this.race.finished && f.owner) {
        const boost = 1 + (this.race.cheers[f.id] ?? 0) * 0.18;
        f.vx = Math.abs(spec.speed) * 1.6 * boost;
        f.facing = 1;
        f.x += f.vx * dt * 9 * speedMul;
        f.y += Math.sin(this.time * 3 + f.x) * dt * 0.8;
        f.y = clamp(f.y, this.waterTop() + 1, this.floorY() - 2);
        continue;
      }

      let ax = 0;
      let ay = 0;
      const pred = this.nearestPred(f);
      if (pred && dist(f.x, f.y, pred.x, pred.y) < 16) {
        ax += Math.sign(f.x - pred.x) * 2.2;
        ay += Math.sign(f.y - pred.y) * 1.4;
        f.happiness = clamp(f.happiness - dt * 3, 0, 100);
      } else if (f.hunger > 22 && this.food.length) {
        const fd = this.nearestFood(f);
        if (fd) {
          ax += Math.sign(fd.x - f.x) * 1.3;
          ay += Math.sign(fd.y - f.y) * 1.1;
        }
      } else if (spec.school && school[f.species] && school[f.species]!.n > 1) {
        const s = school[f.species]!;
        ax += (s.x / s.n - f.x) * 0.08;
        ay += (s.y / s.n - f.y) * 0.08;
        ax += (s.vx / s.n - f.vx) * 0.15;
      } else {
        if (this.time >= f.retargetAt) {
          f.targetX = rand(3, this.w - 4);
          f.targetY = rand(this.waterTop() + 2, this.floorY() - 3);
          f.retargetAt = this.time + rand(3, 9);
        }
        ax += Math.sign(f.targetX - f.x) * 0.45;
        ay += Math.sign(f.targetY - f.y) * 0.25;
      }

      f.vx = clamp((f.vx + ax * dt * 3) * 0.96, -2.4, 2.4);
      f.vy = clamp((f.vy + ay * dt * 3) * 0.94, -1.6, 1.6);
      if (Math.abs(f.vx) < 0.12) f.vx = (f.facing || 1) * 0.2;
      f.x += f.vx * spec.speed * dt * 8 * speedMul;
      f.y += f.vy * spec.speed * dt * 5 * speedMul;
      if (f.x < 1) {
        f.x = 1;
        f.vx = Math.abs(f.vx);
      }
      if (f.x > this.w - 3) {
        f.x = this.w - 3;
        f.vx = -Math.abs(f.vx);
      }
      if (f.y < this.waterTop() + 1) {
        f.y = this.waterTop() + 1;
        f.vy = Math.abs(f.vy);
      }
      if (f.y > this.floorY() - 2) {
        f.y = this.floorY() - 2;
        f.vy = -Math.abs(f.vy);
      }
      f.facing = f.vx >= 0 ? 1 : -1;

      if (f.owner) {
        const v = this.viewers.get(f.owner);
        if (v) {
          v.aliveSeconds += dt;
          v.happiest = Math.max(v.happiest, f.happiness);
          if (v.aliveSeconds > 600 && !v.badges.includes("gardien")) v.badges.push("gardien");
          if (v.aliveSeconds > 1800 && !v.badges.includes("ancien")) v.badges.push("ancien");
        }
      }
    }
  }

  nearestFood(f: Fish): Food | undefined {
    let best: Food | undefined;
    let d = Infinity;
    for (const fd of this.food) {
      const n = dist(f.x, f.y, fd.x, fd.y);
      if (n < d) {
        d = n;
        best = fd;
      }
    }
    return best;
  }

  nearestPred(f: Fish): Predator | undefined {
    let best: Predator | undefined;
    let d = Infinity;
    for (const p of this.predators) {
      const n = dist(f.x, f.y, p.x, p.y);
      if (n < d) {
        d = n;
        best = p;
      }
    }
    return best;
  }

  maybeBreed(): void {
    if (this.tickCount % 24 !== 0 || this.fish.length >= MAX_FISH - 1) return;
    for (let i = 0; i < this.fish.length; i++) {
      const a = this.fish[i]!;
      if (a.growth < 1 || a.happiness < 72 || a.hunger > 45) continue;
      if (this.time - a.lastBreedAt < 90) continue;
      for (let j = i + 1; j < this.fish.length; j++) {
        const b = this.fish[j]!;
        if (b.species !== a.species || b.growth < 1) continue;
        if (b.happiness < 72 || b.hunger > 45) continue;
        if (this.time - b.lastBreedAt < 90) continue;
        if (dist(a.x, a.y, b.x, b.y) > 3.2) continue;
        a.lastBreedAt = this.time;
        b.lastBreedAt = this.time;
        const baby = this.makeFish({
          name: pick(["Bébé", "Mini", "Pip", "Nano"]) + pick(["u", "i", "o", "a"]),
          species: a.species,
          rarity: chance(0.15) ? (RARITY_SCORE[a.rarity] >= RARITY_SCORE[b.rarity] ? a.rarity : b.rarity) : "common",
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
          growth: 0,
        });
        this.fish.push(baby);
        this.action(`${a.name} & ${b.name} ont un bébé ${SPECIES[a.species].nameFr} !`);
        return;
      }
    }
  }

  maybeAmbient(): void {
    if (this.event || this.catchGame || this.race) return;
    if (this.time - this.lastEventAt < EVENT_CD) return;
    const quiet = this.time - this.lastChatAt > 40;
    const p = quiet ? 0.0035 : 0.0009;
    if (!chance(p)) return;
    const kind = pick<EventKind>(["feeding_frenzy", "shark_attack", "bubble_storm", "golden_hour"]);
    const dur = kind === "golden_hour" ? 40 : kind === "feeding_frenzy" ? 24 : 18;
    this.startEvent(kind, null, dur);
  }

  ageAndDeath(dt: number): void {
    if (this.tickCount % 12 !== 0) return;
    const keep: Fish[] = [];
    for (const f of this.fish) {
      const lifespan = (f.owner ? 900 : 520) + RARITY_SCORE[f.rarity] * 40;
      const starving = f.hunger > 96;
      const old = f.age > lifespan && chance(0.08);
      const starved = starving && f.age > 80 && chance(0.05);
      if (old || starved) {
        if (f.owner) {
          const v = this.viewers.get(f.owner);
          const neo = this.makeFish({
            name: f.name,
            species: f.species,
            rarity: f.rarity,
            owner: f.owner,
            ownerDisplay: f.ownerDisplay,
            accessory: f.accessory,
            spawnedBy: f.spawnedBy,
            happiness: 60,
            hunger: 20,
            age: 0,
            growth: 0,
            x: f.x,
            y: f.y,
          });
          keep.push(neo);
          if (v) v.fishId = neo.id;
          this.action(`${f.name} s'est réincarné·e — toujours avec ${f.ownerDisplay ?? f.owner}.`);
        } else {
          this.action(`${f.name} rejoint le courant… un sauvage prend sa place.`);
          const neo = this.spawnWild();
          if (neo) keep.push(neo);
        }
      } else {
        keep.push(f);
      }
    }
    this.fish = keep.slice(0, MAX_FISH);
    void dt;
  }

  tickRace(dt: number): void {
    if (!this.race) return;
    const racers = this.fish.filter((f) => f.owner);
    const winner = racers.find((f) => f.x >= this.w - 8);
    if (winner) {
      this.race.finished = true;
      this.race.winnerId = winner.id;
      const v = winner.owner ? this.viewers.get(winner.owner) : undefined;
      if (v) v.coins += 18;
      this.action(`🏆 ${winner.name} gagne la course ! +18 🪙 pour ${winner.ownerDisplay}`);
      this.race.until = this.time + 3;
    }
    void dt;
  }

  finishRace(): void {
    if (this.race && !this.race.finished) {
      const racers = this.fish.filter((f) => f.owner);
      racers.sort((a, b) => b.x - a.x);
      const winner = racers[0];
      if (winner?.owner) {
        this.viewers.get(winner.owner)!.coins += 12;
        this.action(`Course terminée : ${winner.name} était en tête.`);
      }
    }
    this.race = null;
    for (const f of this.fish) {
      f.x = clamp(f.x, 4, this.w - 8);
    }
  }

  startCatch(user: string): string {
    const left = this.cdLeft(this.lastCatchStart, CATCH_CD);
    if (left > 0) return `Pêche en cooldown (${left}s).`;
    const word = pick(CATCH_WORDS);
    this.catchGame = { word, until: this.time + CATCH_DURATION, startedBy: user };
    this.lastCatchStart = this.time;
    this.startEvent("catch", user, CATCH_DURATION);
    this.action(`Attrapez : ${word}`);
    return `🎣 Pêche éclair ! Tapez ${word} dans le chat — premier arrivé, premier servi !`;
  }

  tryCatch(user: string, message: string): string | null {
    if (!this.catchGame) return null;
    if (message.trim().toUpperCase() !== this.catchGame.word) return null;
    const v = this.viewer(user);
    const luck = 1.6;
    const spawned = this.spawnOwned(user, luck);
    v.coins += 22;
    if (spawned) {
      if (v.fishId) {
        const old = this.fish.find((f) => f.id === v.fishId);
        if (old) {
          old.owner = null;
          old.ownerDisplay = null;
        }
      }
      v.fishId = spawned.id;
      v.spawnedCount++;
      this.action(`${user} attrape ${spawned.name} (${RARITY_FR[spawned.rarity]}) !`);
    }
    this.catchGame = null;
    if (this.event?.kind === "catch") this.event = null;
    return spawned
      ? `🏆 ${user} pèche un ${SPECIES[spawned.species].nameFr} ${RARITY_FR[spawned.rarity]} : ${spawned.name} ! +22 🪙`
      : `🏆 ${user} gagne +22 🪙 (bac plein).`;
  }

  startRace(user: string): string {
    const left = this.cdLeft(this.lastRaceStart, RACE_CD);
    if (left > 0) return `Course en cooldown (${left}s).`;
    const racers = this.fish.filter((f) => f.owner);
    if (racers.length < 2) return "Il faut au moins 2 poissons adoptés pour une course. !fish";
    this.lastRaceStart = this.time;
    this.race = { until: this.time + RACE_DURATION, cheers: {}, finished: false, winnerId: null };
    for (const f of racers) {
      f.x = 2 + rand(0, 4);
      f.y = rand(this.waterTop() + 3, this.floorY() - 4);
      f.facing = 1;
    }
    this.startEvent("race", user, RACE_DURATION);
    return `🏁 Course ! Encouragez avec !go — premier à droite gagne 18 🪙.`;
  }

  cheer(user: string): string {
    if (!this.race || this.race.finished) return "Pas de course en cours. !race";
    const f = this.ownedFish(user);
    if (!f) return "Tu n'as pas de poisson. !fish";
    this.race.cheers[f.id] = (this.race.cheers[f.id] ?? 0) + 1;
    this.action(`${user} encourage ${f.name} !`);
    return `📣 ${f.name} accélère (${this.race.cheers[f.id]} cheers)`;
  }

  onSub(user: string): string {
    this.dropFood(10);
    const mythic = chance(0.45);
    const f = this.spawnWild(mythic ? "legendary" : "epic");
    this.action(`⭐ Sub de ${user} — ${mythic ? "légendaire" : "épic"} apparaît !`);
    if (f) f.name = `Sub-${user.slice(0, 8)}`;
    return `⭐ Merci ${user} ! Nourriture + poisson ${f ? RARITY_FR[f.rarity] : ""} dans le bac.`;
  }

  onBits(user: string, bits: number): string {
    const n = clamp(Math.floor(bits / 10), 1, 24);
    this.dropFood(n);
    this.viewer(user).coins += Math.min(40, Math.floor(bits / 5));
    this.action(`💎 ${user} cheer ${bits} bits → ${n} granulés`);
    return `💎 ${user} largue ${n} granulés (${bits} bits) !`;
  }

  snapshot(): Snapshot {
    const phase = this.phase();
    const t = this.timeOfDay();
    const drawables: Snapshot["drawables"] = [];
    const frame = Math.floor(this.time * 2);

    const foamLine = Array.from({ length: this.w }, (_, x) => ((x + frame) % 4 === 0 ? "-" : "~")).join("");
    drawables.push({ x: 0, y: 0, lines: [foamLine], color: "foam", z: 0 });
    const sand1 = Array.from({ length: this.w }, (_, x) =>
      (x + Math.floor(this.time)) % 2 === 0 ? "." : ":",
    ).join("");
    drawables.push({ x: 0, y: this.h - 2, lines: [sand1], color: "sand", z: 1 });
    drawables.push({ x: 0, y: this.h - 1, lines: ["░".repeat(this.w)], color: "sand", z: 1 });

    for (const d of this.decors) {
      const art = decorArt(d.kind, frame + d.x);
      const h = art.lines.length;
      drawables.push({ x: Math.round(d.x), y: this.floorY() - h + 1, lines: art.lines, color: art.color, z: 2 });
    }
    for (const fd of this.food) {
      drawables.push({ x: Math.round(fd.x), y: Math.round(fd.y), lines: ["*"], color: "food", z: 3 });
    }
    for (const c of this.crabs) {
      drawables.push({
        x: Math.round(c.x),
        y: this.floorY() - 1,
        lines: [crabArt(c.facing)],
        color: "crab",
        z: 4,
      });
    }
    for (const f of this.fish) {
      const lines = fishArt(f.rarity, f.facing, f.growth, f.species === "puffer");
      const glyph = accessoryGlyph(f.accessory);
      const art = glyph ? [glyph, ...lines] : lines;
      const label = f.owner ? f.name.slice(0, 10) : undefined;
      drawables.push({
        x: Math.round(f.x),
        y: Math.max(0, Math.round(f.y) - (glyph ? 1 : 0)),
        lines: art,
        color: f.rarity,
        z: 5 + RARITY_SCORE[f.rarity] * 0.01,
        label,
      });
    }
    for (const p of this.predators) {
      if (p.kind === "shark") {
        drawables.push({ x: Math.round(p.x), y: Math.round(p.y), lines: sharkArt(p.facing), color: "shark", z: 7 });
      } else {
        drawables.push({ x: Math.round(p.x), y: Math.round(p.y), lines: [piranhaArt(p.facing)], color: "shark", z: 7 });
      }
    }
    for (const b of this.bubbles) {
      drawables.push({ x: Math.round(b.x), y: Math.round(b.y), lines: [b.ch], color: "bubble", z: 8 });
    }

    const coinsHint = [...this.viewers.values()].reduce((s, v) => s + v.coins, 0);
    let banner = this.battleBanner;
    if (!banner && this.event) {
      const left = Math.max(0, Math.ceil(this.event.until - this.time));
      banner = `${this.event.labelFr} · ${this.event.labelEn} (${left}s)`;
    }
    if (!banner && this.catchGame) banner = `Tapez ${this.catchGame.word} !`;

    let raceHud: Snapshot["race"] = null;
    if (this.race) {
      const racers = this.fish.filter((f) => f.owner).sort((a, b) => b.x - a.x);
      raceHud = { names: racers.slice(0, 4).map((f) => f.name), lead: racers[0]?.name ?? null };
    }

    const phaseLabel =
      phase === "day" ? "Jour" : phase === "night" ? "Nuit" : phase === "dawn" ? "Aube" : "Crépuscule";

    return {
      w: this.w,
      h: this.h,
      phase,
      timeOfDay: t,
      hud: {
        fish: this.fish.length,
        food: this.food.length,
        coinsHint,
        event: this.event ? this.event.labelFr : null,
        lastAction: this.lastAction,
        phaseLabel,
        twitch: this.twitchLive ? "live" : "dry-run",
      },
      drawables,
      catchWord: this.catchGame?.word ?? null,
      banner,
      race: raceHud,
    };
  }

  /* ---- command helpers used by commands.ts ---- */

  adopt(user: string): string {
    const v = this.viewer(user);
    const existing = this.ownedFish(user);
    if (existing) {
      return `Tu as déjà ${existing.name} (${SPECIES[existing.species].nameFr}, ${RARITY_FR[existing.rarity]}). !myfish`;
    }
    const left = this.cdLeft(v.lastFishAt, FISH_CD);
    if (left > 0) return `Adoption dans ${left}s.`;
    const f = this.spawnOwned(user, this.event?.kind === "golden_hour" ? 0.8 : 0);
    if (!f) return "Le bac est plein (42). Relâchez un poisson !";
    v.fishId = f.id;
    v.lastFishAt = this.time;
    v.spawnedCount++;
    if (v.spawnedCount >= 5 && !v.badges.includes("éleveur")) v.badges.push("éleveur");
    this.action(`${user} adopte ${f.name} [${RARITY_FR[f.rarity]}]`);
    return `🐟 ${user} adopte ${f.name} — ${SPECIES[f.species].nameFr} ${RARITY_FR[f.rarity]} ! Bonheur ${Math.round(f.happiness)}.`;
  }

  feed(user: string): string {
    const v = this.viewer(user);
    const left = this.cdLeft(v.lastFeedAt, FEED_CD);
    if (left > 0) return `Nourrir : encore ${left}s.`;
    v.lastFeedAt = this.time;
    const n = this.event?.kind === "feeding_frenzy" ? 7 : 4;
    const x = this.ownedFish(user)?.x;
    this.dropFood(n, x);
    v.coins += 1;
    const day = dayKey();
    if (v.lastFeedDay !== day) {
      const yesterday = dayKey(Date.now() - 86400000);
      v.feedStreak = v.lastFeedDay === yesterday ? v.feedStreak + 1 : 1;
      v.lastFeedDay = day;
      if (v.feedStreak >= 3 && !v.badges.includes("streak3")) v.badges.push("streak3");
      v.coins += Math.min(8, v.feedStreak);
    }
    this.action(`${user} nourrit le bac (+${n})`);
    return `🍽️ ${user} jette ${n} granulés · +1 🪙 (solde ${v.coins}) · streak ${v.feedStreak}j`;
  }

  status(): string {
    const owners = this.fish.filter((f) => f.owner).length;
    const ev = this.event ? `${this.event.labelFr}` : "calme";
    const top = [...this.viewers.values()]
      .sort((a, b) => b.spawnedCount - a.spawnedCount)
      .slice(0, 3)
      .map((v) => v.display)
      .join(", ");
    return `🐠 Bac : ${this.fish.length} poissons (${owners} adoptés), ${this.food.length} granulés, décor ${this.decors.length}. Événement : ${ev}. Top éleveurs : ${top || "—"}.`;
  }

  myFish(user: string): string {
    const f = this.ownedFish(user);
    const v = this.viewer(user);
    if (!f) return `Pas de poisson. !fish pour adopter · 🪙 ${v.coins}`;
    const age = Math.floor(f.age);
    const grow = f.growth === 0 ? "bébé" : f.growth === 1 ? "adulte" : "ancien";
    const badges = v.badges.length ? ` badges: ${v.badges.join(",")}` : "";
    return `🐟 ${f.name} · ${SPECIES[f.species].nameFr} · ${RARITY_FR[f.rarity]} · ${grow} · ${age}s · ❤️ ${Math.round(f.happiness)} · faim ${Math.round(f.hunger)} · 🪙 ${v.coins}${badges}`;
  }

  rename(user: string, name: string): string {
    const f = this.ownedFish(user);
    if (!f) return "Pas de poisson. !fish";
    const v = this.viewer(user);
    if (this.cdLeft(v.lastNameAt, 15) > 0) return "Renommage toutes les 15s.";
    const clean = name.replace(/[^\p{L}\p{N} _\-']/gu, "").trim().slice(0, 14);
    if (clean.length < 2) return "Nom trop court (2-14).";
    f.name = clean;
    v.lastNameAt = this.time;
    this.action(`${user} nomme son poisson ${clean}`);
    return `✏️ Ton poisson s'appelle maintenant ${clean}.`;
  }

  release(user: string): string {
    const f = this.ownedFish(user);
    if (!f) return "Pas de poisson à relâcher.";
    const v = this.viewer(user);
    v.fishId = null;
    v.lastFishAt = this.time;
    f.owner = null;
    f.ownerDisplay = null;
    this.action(`${user} relâche ${f.name} dans la nature`);
    return `🌊 ${f.name} nage librement. Tu pourras !fish dans ${FISH_CD}s.`;
  }

  treasure(user: string): string {
    const v = this.viewer(user);
    const left = this.cdLeft(v.lastTreasureAt, TREASURE_CD);
    if (left > 0) return `Fouille dans ${left}s.`;
    v.lastTreasureAt = this.time;
    const jackpot = chance(0.06);
    const coins = jackpot ? irand(80, 140) : irand(6, 22);
    v.coins += coins;
    this.action(`${user} fouille le coffre : +${coins} 🪙`);
    return jackpot
      ? `💎 JACKPOT ! ${user} trouve ${coins} 🪙 (solde ${v.coins})`
      : `🪙 ${user} déterre ${coins} 🪙 (solde ${v.coins})`;
  }

  shopList(): string {
    const a = SHOP.map((s) => `${s.id} ${s.cost}🪙`).join(" · ");
    const d = DECOR_SHOP.map((s) => `!decor ${s.kind} ${s.cost}🪙`).join(" · ");
    return `🛒 !buy ${a} | Décor: ${d}`;
  }

  buy(user: string, itemId: string): string {
    const v = this.viewer(user);
    const item = SHOP.find(
      (s) =>
        s.id === itemId.toLowerCase() ||
        s.nameEn.toLowerCase().includes(itemId.toLowerCase()) ||
        s.nameFr.toLowerCase().includes(itemId.toLowerCase()),
    );
    if (!item) return `Inconnu. ${this.shopList()}`;
    if (v.coins < item.cost) return `Pas assez (🪙 ${v.coins}/${item.cost}). !treasure`;
    v.coins -= item.cost;
    if (item.kind === "consumable") {
      this.dropFood(8);
      this.action(`${user} achète un pack de nourriture`);
      return `🛒 Pack largué. Solde ${v.coins} 🪙`;
    }
    const acc = item.accessory!;
    if (!v.accessories.includes(acc)) v.accessories.push(acc);
    const f = this.ownedFish(user);
    if (f) f.accessory = acc;
    this.action(`${user} équipe ${item.nameFr}`);
    return `✨ ${item.nameFr} équipé sur ${f?.name ?? "ton prochain poisson"}. Solde ${v.coins} 🪙`;
  }

  placeDecor(user: string, kindRaw: string): string {
    const v = this.viewer(user);
    const item = DECOR_SHOP.find(
      (d) =>
        d.kind === kindRaw.toLowerCase() ||
        d.nameFr.toLowerCase().includes(kindRaw.toLowerCase()) ||
        d.nameEn.toLowerCase().includes(kindRaw.toLowerCase()),
    );
    if (!item) return `Décor : ${DECOR_SHOP.map((d) => d.kind).join(", ")}`;
    if (this.decors.length >= MAX_DECOR) return "Plus de place pour le décor.";
    if (v.coins < item.cost) return `Pas assez (🪙 ${v.coins}/${item.cost}).`;
    v.coins -= item.cost;
    this.decors.push({
      id: uid("d"),
      kind: item.kind,
      x: irand(2, this.w - 8),
      y: this.floorY(),
      placedBy: this.key(user),
    });
    this.action(`${user} place un ${item.nameFr}`);
    return `🏛️ ${item.nameFr} installé ! Solde ${v.coins} 🪙`;
  }

  top(kind: string): string {
    const k = kind.toLowerCase();
    const arr = [...this.viewers.values()];
    if (k === "happy" || k === "heureux" || k === "bonheur") {
      const rows = this.fish
        .filter((f) => f.owner)
        .sort((a, b) => b.happiness - a.happiness)
        .slice(0, 5)
        .map((f, i) => `${i + 1}. ${f.name} (${Math.round(f.happiness)})`);
      return `❤️ Plus heureux : ${rows.join(" · ") || "—"}`;
    }
    if (k === "fish" || k === "poissons" || k === "spawn") {
      arr.sort((a, b) => b.spawnedCount - a.spawnedCount);
      return `🐟 Éleveurs : ${arr
        .slice(0, 5)
        .map((v, i) => `${i + 1}. ${v.display} (${v.spawnedCount})`)
        .join(" · ") || "—"}`;
    }
    arr.sort((a, b) => b.coins - a.coins);
    return `🪙 Riches : ${arr
      .slice(0, 5)
      .map((v, i) => `${i + 1}. ${v.display} (${v.coins})`)
      .join(" · ") || "—"}`;
  }

  battle(user: string, targetRaw: string): string {
    const v = this.viewer(user);
    const left = this.cdLeft(v.lastBattleAt, BATTLE_CD);
    if (left > 0) return `Duel dans ${left}s.`;
    const target = targetRaw.replace(/^@/, "").trim();
    if (!target) return "Usage : !battle @pseudo";
    if (this.key(target) === this.key(user)) return "Pas de duel contre toi-même.";
    const a = this.ownedFish(user);
    const b = this.ownedFish(target);
    if (!a) return "Adopte un poisson d'abord (!fish).";
    if (!b) return `${target} n'a pas de poisson.`;
    v.lastBattleAt = this.time;
    const power = (f: Fish) =>
      f.growth * 8 + f.happiness * 0.25 + RARITY_SCORE[f.rarity] * 3 + rand(0, 18) + (f.age > 120 ? 4 : 0);
    const pa = power(a);
    const pb = power(b);
    const aWins = pa >= pb;
    const winner = aWins ? a : b;
    const loser = aWins ? b : a;
    winner.happiness = clamp(winner.happiness + 8, 0, 100);
    loser.happiness = clamp(loser.happiness - 4, 0, 100);
    const wv = this.viewers.get(winner.owner!)!;
    wv.coins += 10;
    const flavor = pick([
      "éblouit le public",
      "gagne la parade nageoire",
      "danse mieux sur le sable",
      "brillait plus fort",
      "remporte le splash d'honneur",
    ]);
    this.battleBanner = `${a.name} VS ${b.name} → ${winner.name}`;
    this.battleBannerUntil = this.time + 8;
    this.action(`⚔️ ${winner.name} ${flavor} face à ${loser.name}`);
    return `⚔️ ${a.name} (${Math.round(pa)}) VS ${b.name} (${Math.round(pb)}) — ${winner.name} ${flavor} ! +10 🪙 ${wv.display}`;
  }

  help(): string {
    return "Commandes: !fish !feed !myfish !name !release !aquarium !catch !race !go !battle @u !treasure !shop !buy !decor !top !help · FR: !poisson !nourrir !monpoisson !nom !bac !peche !course !tresor !boutique";
  }

  coins(user: string): string {
    const v = this.viewer(user);
    return `🪙 ${v.display}: ${v.coins} · streak ${v.feedStreak}j · badges ${v.badges.join(",") || "aucun"}`;
  }
}

export function growthOf(f: Fish): string {
  return f.growth === 0 ? "bébé" : f.growth === 1 ? "adulte" : "ancien";
}

export type { SpeciesId };
