export type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
export type Growth = 0 | 1 | 2;
export type Phase = "dawn" | "day" | "dusk" | "night";
export type EventKind =
  | "feeding_frenzy"
  | "shark_attack"
  | "bubble_storm"
  | "golden_hour"
  | "catch"
  | "race";

export type SpeciesId =
  | "guppy"
  | "tetra"
  | "minnow"
  | "clown"
  | "neon"
  | "puffer"
  | "angel"
  | "tang"
  | "betta"
  | "mandarin"
  | "discus"
  | "koi"
  | "moon"
  | "dragon"
  | "phoenix";

export type DecorKind = "seaweed" | "coral" | "rock" | "chest" | "castle" | "anemone";
export type AccessoryId = "crown" | "halo" | "sparkle" | "monocle";

export interface Fish {
  id: string;
  name: string;
  owner: string | null;
  ownerDisplay: string | null;
  species: SpeciesId;
  rarity: Rarity;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  hunger: number;
  happiness: number;
  age: number;
  growth: Growth;
  lastBreedAt: number;
  accessory: AccessoryId | null;
  retargetAt: number;
  targetX: number;
  targetY: number;
  spawnedBy: string | null;
}

export interface Food {
  id: string;
  x: number;
  y: number;
  vy: number;
}

export interface Bubble {
  id: string;
  x: number;
  y: number;
  speed: number;
  ch: string;
}

export interface Decor {
  id: string;
  kind: DecorKind;
  x: number;
  y: number;
  placedBy: string | null;
}

export interface Predator {
  id: string;
  kind: "shark" | "piranha";
  x: number;
  y: number;
  vx: number;
  facing: 1 | -1;
}

export interface Crab {
  id: string;
  x: number;
  facing: 1 | -1;
  vx: number;
}

export interface Viewer {
  username: string;
  display: string;
  coins: number;
  fishId: string | null;
  lastFeedAt: number;
  lastTreasureAt: number;
  lastFishAt: number;
  lastBattleAt: number;
  lastNameAt: number;
  feedStreak: number;
  lastFeedDay: string;
  accessories: AccessoryId[];
  badges: string[];
  spawnedCount: number;
  happiest: number;
  aliveSeconds: number;
}

export interface TankEvent {
  kind: EventKind;
  labelFr: string;
  labelEn: string;
  until: number;
  startedBy: string | null;
}

export interface CatchGame {
  word: string;
  until: number;
  startedBy: string;
}

export interface RaceState {
  until: number;
  cheers: Record<string, number>;
  finished: boolean;
  winnerId: string | null;
}

export interface Drawable {
  x: number;
  y: number;
  lines: string[];
  color: string;
  z: number;
  label?: string;
}

export interface Snapshot {
  w: number;
  h: number;
  phase: Phase;
  timeOfDay: number;
  hud: {
    fish: number;
    food: number;
    coinsHint: number;
    event: string | null;
    lastAction: string;
    phaseLabel: string;
    twitch: "live" | "dry-run";
  };
  drawables: Drawable[];
  catchWord: string | null;
  banner: string | null;
  race: { names: string[]; lead: string | null } | null;
}

export interface PersistBlob {
  version: 1;
  savedAt: number;
  time: number;
  tickCount: number;
  fish: Fish[];
  decors: Decor[];
  crabs: Crab[];
  viewers: Viewer[];
  lastAction: string;
}
