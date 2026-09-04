import { chance, irand, pick } from "./rng.js";
import type { AccessoryId, DecorKind, Growth, Rarity, SpeciesId } from "./types.js";

export const RARITY_ORDER: Rarity[] = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "mythic",
];

export const RARITY_FR: Record<Rarity, string> = {
  common: "Commun",
  uncommon: "Peu commun",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
  mythic: "Mythique",
};

export const RARITY_SCORE: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 4,
  epic: 7,
  legendary: 12,
  mythic: 20,
};

export const SPECIES: Record<
  SpeciesId,
  { id: SpeciesId; nameEn: string; nameFr: string; speed: number; school: boolean; rarities: Rarity[] }
> = {
  guppy: { id: "guppy", nameEn: "Guppy", nameFr: "Guppy", speed: 1.15, school: true, rarities: ["common"] },
  tetra: { id: "tetra", nameEn: "Tetra", nameFr: "Tétra", speed: 1.2, school: true, rarities: ["common"] },
  minnow: { id: "minnow", nameEn: "Minnow", nameFr: "Vairon", speed: 1.3, school: true, rarities: ["common"] },
  clown: { id: "clown", nameEn: "Clownfish", nameFr: "Poisson-clown", speed: 0.95, school: false, rarities: ["uncommon"] },
  neon: { id: "neon", nameEn: "Neon", nameFr: "Néon", speed: 1.25, school: true, rarities: ["uncommon"] },
  puffer: { id: "puffer", nameEn: "Puffer", nameFr: "Poisson-globe", speed: 0.7, school: false, rarities: ["uncommon"] },
  angel: { id: "angel", nameEn: "Angelfish", nameFr: "Scalaire", speed: 0.85, school: false, rarities: ["rare"] },
  tang: { id: "tang", nameEn: "Tang", nameFr: "Chirurgien", speed: 1.05, school: false, rarities: ["rare"] },
  betta: { id: "betta", nameEn: "Betta", nameFr: "Combattant", speed: 0.9, school: false, rarities: ["rare"] },
  mandarin: { id: "mandarin", nameEn: "Mandarin", nameFr: "Mandarin", speed: 0.75, school: false, rarities: ["epic"] },
  discus: { id: "discus", nameEn: "Discus", nameFr: "Discus", speed: 0.8, school: false, rarities: ["epic"] },
  koi: { id: "koi", nameEn: "Koi", nameFr: "Koï", speed: 0.7, school: false, rarities: ["legendary"] },
  moon: { id: "moon", nameEn: "Moonfish", nameFr: "Poisson-lune", speed: 0.65, school: false, rarities: ["legendary"] },
  dragon: { id: "dragon", nameEn: "Sea dragon", nameFr: "Dragon des mers", speed: 0.85, school: false, rarities: ["mythic"] },
  phoenix: { id: "phoenix", nameEn: "Phoenix koi", nameFr: "Koï phénix", speed: 0.9, school: false, rarities: ["mythic"] },
};

const SPECIES_BY_RARITY: Record<Rarity, SpeciesId[]> = {
  common: ["guppy", "tetra", "minnow"],
  uncommon: ["clown", "neon", "puffer"],
  rare: ["angel", "tang", "betta"],
  epic: ["mandarin", "discus"],
  legendary: ["koi", "moon"],
  mythic: ["dragon", "phoenix"],
};

export const WILD_NAMES = [
  "Bubulle",
  "Nemo",
  "Sushi",
  "Miso",
  "Pixel",
  "Glouglou",
  "Perle",
  "Moka",
  "Wasabi",
  "Nori",
  "Luna",
  "Zigzag",
  "Miette",
  "Splash",
  "Coral",
  "Pesto",
  "Yuzu",
  "Tofu",
  "Kiki",
  "Biscuit",
];

export const CATCH_WORDS = [
  "BULLE",
  "CORAIL",
  "REQUIN",
  "TRESOR",
  "ALGUE",
  "PERLE",
  "VAGUE",
  "NEMO",
  "BUBBLE",
  "GOLDEN",
  "MYTHIC",
  "KOI",
  "NEON",
  "CRABE",
  "CASTLE",
  "ANEMONE",
  "FRITES",
  "SAKURA",
];

export interface ShopItem {
  id: string;
  kind: "accessory" | "consumable";
  nameFr: string;
  nameEn: string;
  cost: number;
  accessory?: AccessoryId;
}

export const SHOP: ShopItem[] = [
  { id: "foodpack", kind: "consumable", nameFr: "Pack de granulés x8", nameEn: "Food pack x8", cost: 20 },
  { id: "sparkle", kind: "accessory", nameFr: "Étincelles", nameEn: "Sparkles", cost: 30, accessory: "sparkle" },
  { id: "monocle", kind: "accessory", nameFr: "Monocle", nameEn: "Monocle", cost: 45, accessory: "monocle" },
  { id: "crown", kind: "accessory", nameFr: "Couronne", nameEn: "Crown", cost: 50, accessory: "crown" },
  { id: "halo", kind: "accessory", nameFr: "Auréole", nameEn: "Halo", cost: 60, accessory: "halo" },
];

export interface DecorItem {
  kind: DecorKind;
  cost: number;
  nameFr: string;
  nameEn: string;
}

export const DECOR_SHOP: DecorItem[] = [
  { kind: "rock", cost: 10, nameFr: "rocher", nameEn: "rock" },
  { kind: "seaweed", cost: 15, nameFr: "algue", nameEn: "seaweed" },
  { kind: "coral", cost: 25, nameFr: "corail", nameEn: "coral" },
  { kind: "anemone", cost: 35, nameFr: "anémone", nameEn: "anemone" },
  { kind: "chest", cost: 40, nameFr: "coffre", nameEn: "chest" },
  { kind: "castle", cost: 80, nameFr: "château", nameEn: "castle" },
];

const WEIGHTS: [Rarity, number][] = [
  ["common", 560],
  ["uncommon", 240],
  ["rare", 120],
  ["epic", 50],
  ["legendary", 24],
  ["mythic", 6],
];

export function rollRarity(luck = 0): Rarity {
  const boosted = WEIGHTS.map(([r, w]) => {
    const idx = RARITY_ORDER.indexOf(r);
    const bonus = luck > 0 && idx >= 2 ? w * (1 + luck * (idx - 1) * 0.35) : w;
    const penalty = luck < 0 && idx <= 1 ? w * (1 - luck) : bonus;
    return [r, penalty] as [Rarity, number];
  });
  const total = boosted.reduce((s, [, w]) => s + w, 0);
  let n = Math.random() * total;
  for (const [r, w] of boosted) {
    n -= w;
    if (n <= 0) return r;
  }
  return "common";
}

export function speciesForRarity(r: Rarity): SpeciesId {
  return pick(SPECIES_BY_RARITY[r]);
}

export function accessoryGlyph(id: AccessoryId | null): string {
  if (id === "crown") return "ˆ";
  if (id === "halo") return "˚";
  if (id === "sparkle") return "✦";
  if (id === "monocle") return "◦";
  return "";
}

type Sprite = { L: string[]; R: string[] };

const BABY: Sprite = { L: ["<˚"], R: ["˚>"] };

const SPECIES_ART: Record<SpeciesId, { adult: Sprite; elder?: Sprite }> = {
  guppy: { adult: { L: ["<><"], R: ["><>"] }, elder: { L: ["<═><"], R: [">═><"] } },
  tetra: { adult: { L: ["<≡<"], R: [">≡>"] }, elder: { L: ["<≡≡<"], R: [">≡≡>"] } },
  minnow: { adult: { L: ["<·<"], R: [">·>"] }, elder: { L: ["<··<"], R: [">··>"] } },
  clown: { adult: { L: ["<º))><"], R: ["><((º>"] }, elder: { L: ["<º)))><"], R: ["><(((º>"] } },
  neon: { adult: { L: ["<≈≈<"], R: [">≈≈>"] }, elder: { L: ["<≈≈≈<"], R: [">≈≈≈>"] } },
  puffer: { adult: { L: ["<(º)"], R: ["(º)>"] }, elder: { L: ["<(ºº)"], R: ["(ºº)>"] } },
  angel: { adult: { L: ["</º\\<"], R: [">/º\\>"] }, elder: { L: ["<</º\\<"], R: [">/º\\>>"] } },
  tang: { adult: { L: ["<º)))><"], R: ["><(((º>"] }, elder: { L: ["<º))))><"], R: ["><((((º>"] } },
  betta: { adult: { L: ["<º}}}<"], R: [">{{{º>"] }, elder: { L: ["<º}}}}<"], R: [">{{{{º>"] } },
  mandarin: { adult: { L: ["<º)*><"], R: ["><*(º>"] }, elder: { L: ["<º))**><"], R: ["><**((º>"] } },
  discus: { adult: { L: ["(░º░)"], R: ["(░º░)"] }, elder: { L: ["(▒º▒)"], R: ["(▒º▒)"] } },
  koi: { adult: { L: ["<º*)))><"], R: ["><(((º*>"] }, elder: { L: ["<º*))))><"], R: ["><((((º*>"] } },
  moon: { adult: { L: ["(·º·)"], R: ["(·º·)"] }, elder: { L: ["( ·º· )"], R: ["( ·º· )"] } },
  dragon: {
    adult: { L: ["~<{º><"], R: ["><º}>~"] },
    elder: { L: ["~~<{{º><"], R: ["><º}}>~~"] },
  },
  phoenix: {
    adult: { L: ["*<º{><*"], R: ["*><}º>*"] },
    elder: { L: ["*~<º{{><*"], R: ["*><}}º>~*"] },
  },
};

const RARITY_FALLBACK: Record<Rarity, Sprite> = {
  common: { L: ["<><"], R: ["><>"] },
  uncommon: { L: ["<≈><"], R: [">≈><"] },
  rare: { L: ["<º))><"], R: ["><((º>"] },
  epic: { L: ["<º)*><"], R: ["><*(º>"] },
  legendary: { L: ["<º*)))><"], R: ["><(((º*>"] },
  mythic: { L: ["~<{º><"], R: ["><º}>~"] },
};

export function fishArt(
  rarity: Rarity,
  facing: 1 | -1,
  growth: Growth,
  species?: SpeciesId | boolean,
): string[] {
  const left = facing < 0;
  if (growth === 0) return left ? BABY.L : BABY.R;

  const id = typeof species === "string" ? species : species === true ? "puffer" : undefined;
  const entry = id ? SPECIES_ART[id] : undefined;
  const sprite = (growth >= 2 && entry?.elder ? entry.elder : entry?.adult) ?? RARITY_FALLBACK[rarity];
  return left ? sprite.L : sprite.R;
}

export function decorArt(kind: DecorKind, frame: number): { lines: string[]; color: string } {
  const sway = frame % 4 < 2;
  switch (kind) {
    case "seaweed":
      return {
        color: "weed",
        lines: sway ? ["  )", " /", " |", " \\", " |"] : [" (", "  \\", "  |", " /", " |"],
      };
    case "coral":
      return {
        color: "coral",
        lines: sway ? [" *Y*", " /|\\", "  |"] : [" *X*", " /|\\", "  |"],
      };
    case "rock":
      return { color: "rock", lines: [" ,oO.", "/____\\"] };
    case "chest":
      return { color: "chest", lines: sway ? [" [$]", " └─┘"] : [" [✦]", " └─┘"] };
    case "castle":
      return { color: "castle", lines: [" /^^\\", "/|[]|\\", " |__|"] };
    case "anemone":
      return { color: "coral", lines: sway ? [" \\:/", " /o\\"] : [" /:\\", " \\o/"] };
    default:
      return { color: "rock", lines: ["."] };
  }
}

export function sharkArt(facing: 1 | -1): string[] {
  return facing > 0 ? ["  __/\\_", "<º____\\"] : [" _/\\__", "/____º>"];
}

export function piranhaArt(facing: 1 | -1): string {
  return facing > 0 ? "<*)═" : "═(*<";
}

export function crabArt(facing: 1 | -1): string {
  return facing > 0 ? "‹•═" : "═•›";
}

export function findShop(query: string): ShopItem | DecorItem | undefined {
  const q = query.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const shopHit = SHOP.find((s) => s.id === q || s.nameFr.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q));
  if (shopHit) return shopHit;
  return DECOR_SHOP.find(
    (d) => d.kind === q || d.nameFr.toLowerCase().includes(q) || d.nameEn.toLowerCase().includes(q),
  );
}

export function dayKey(now = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export function luckyRoll(extra = false): Rarity {
  return rollRarity(extra ? 1.4 : chance(0.08) ? 0.4 : 0);
}

export function irandName(): string {
  return pick(WILD_NAMES) + (chance(0.35) ? String(irand(2, 99)) : "");
}
