export const STAKE_TERMS = [
  "clutch",
  "ace",
  "1v1",
  "1v2",
  "1v3",
  "1v4",
  "1v5",
  "promo",
  "promotion",
  "ranked",
  "rank",
  "match point",
  "matchpoint",
  "overtime",
  "overtime",
  "boss",
  "final",
  "finale",
  "dernier round",
  "last round",
  "last kill",
  "match point",
  "championship",
  "win",
  "victory",
  "defuse",
  "spike",
  "plant",
  "ace",
  "pentakill",
  "penta",
  "quad",
  "triple",
  "overtime",
  "match d'après",
  "c'est le round",
  "cest le round",
  "on est promo",
  "on joue notre vie",
  "all in",
  "do or die",
  "must win",
  "elo",
  "radiant",
  "immortal",
  "diamond",
  "ascendant",
  "premier",
  "worlds",
  "playoff",
];

export const TENSION_TERMS = [
  "attention",
  "careful",
  "wait",
  "wait wait",
  "chut",
  "shhh",
  "quiet",
  "focus",
  "concentrate",
  "j'entends",
  "i hear",
  "he's one",
  "il est one",
  "low",
  "one hp",
  "1 hp",
  "don't peek",
  "ne peek pas",
  "hold",
  "on hold",
  "eco",
  "force",
  "force buy",
];

export const EVENT_TERMS = [
  "ace",
  "clutch",
  "nice",
  "insane",
  "incroyable",
  "let's go",
  "lets go",
  "gooo",
  "headshot",
  "hs",
  "killed",
  "éliminé",
  "down",
  "dropped",
  "won",
  "on l'a",
  "c'est gagné",
  "cest gagne",
  "ez",
  "too easy",
];

export const REACTION_TERMS = [
  "what",
  "wtf",
  "omg",
  "no way",
  "nah",
  "bro",
  "jpp",
  "ptdr",
  "mdr",
  "lol",
  "lmao",
  "impossible",
  "i can't",
  "j'y crois pas",
  "jy crois pas",
  "oh my god",
  "oh putain",
  "putain",
  "holy",
  "yo",
  "lets gooo",
  "let's gooo",
  "aaaa",
  "ahhh",
  "bruh",
  "sheeeesh",
  "sheesh",
];

export const CONCLUSION_TERMS = [
  "gg",
  "wp",
  "good game",
  "c'était chaud",
  "cetait chaud",
  "on l'a fait",
  "on la fait",
  "we did it",
  "that's how",
  "voilà",
  "voila",
  "anyway",
  "bon",
  "next",
  "go next",
  "diff",
  "unlucky",
  "lucky",
  "je savais",
  "i knew",
  "called it",
];

export const SCREAM_ONLY_TERMS = [
  "ahhh",
  "aaaa",
  "aaaah",
  "waaaa",
  "waaa",
  "nooo",
  "aaa",
  "ahh",
  "aah",
];

export const CHAT_HYPE_TERMS = [
  "pog",
  "poggers",
  "pogchamp",
  "kekw",
  "lul",
  "omegalul",
  "clip",
  "clip it",
  "clippez",
  "clipper",
  "holy",
  "insane",
  "wtf",
  "letsgo",
  "let's go",
  "gg",
  "ez",
  "sheesh",
  "fire",
  "banger",
  "monka",
  "pepehands",
  "sadge",
];

export const GAME_HINTS: Array<{ title: string; genre: string; terms: string[] }> = [
  {
    title: "Valorant",
    genre: "tactical fps",
    terms: ["spike", "jett", "reyna", "omen", "viper", "ace", "clutch", "eco", "radiant"],
  },
  {
    title: "League of Legends",
    genre: "moba",
    terms: ["baron", "dragon", "gank", "adc", "mid", "jg", "pentakill", "ff 15"],
  },
  {
    title: "Fortnite",
    genre: "battle royale",
    terms: ["build", "box", "zone", "victory royale", "crank"],
  },
  {
    title: "Minecraft",
    genre: "sandbox",
    terms: ["creeper", "nether", "diamond", "villager", "speedrun"],
  },
  {
    title: "GTA V",
    genre: "open world",
    terms: ["lspd", "heist", "los santos", "wanted"],
  },
  {
    title: "Just Chatting",
    genre: "irl",
    terms: ["juste chatting", "just chatting", "irl", "storytime", "drama"],
  },
];

export function includesTerm(text: string, terms: string[]): boolean {
  const hay = text.toLowerCase();
  return terms.some((term) => hay.includes(term));
}

export function countTerms(text: string, terms: string[]): number {
  const hay = text.toLowerCase();
  return terms.reduce((n, term) => n + (hay.includes(term) ? 1 : 0), 0);
}

export function isMostlyScream(text: string): boolean {
  const cleaned = text.toLowerCase().replace(/[^a-zàâçéèêëîïôùûüÿœ\s]/gi, " ").trim();
  if (!cleaned) return true;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const screamWords = words.filter((w) =>
    SCREAM_ONLY_TERMS.some((t) => w.startsWith(t) || t.startsWith(w)),
  );
  return screamWords.length / words.length >= 0.6 && words.length <= 6;
}
