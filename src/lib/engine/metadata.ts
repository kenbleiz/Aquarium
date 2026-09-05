import { CONCLUSION_TERMS, EVENT_TERMS, STAKE_TERMS, includesTerm } from "./lexicon";
import { formatTimecode } from "./math";
import { textInRange } from "./transcript";
import type { ClipMetadata, SessionSignals } from "./types";
import type { RawStory } from "./story-arc";

export function buildMetadata(
  story: RawStory,
  signals: SessionSignals,
  viral: number,
): ClipMetadata {
  const text = textInRange(signals.transcript, story.startMs, story.endMs);
  const game = signals.game?.title;
  const hook = pickHook(text, story);
  const title = composeTitle(hook, game, viral);
  const description = composeDescription(story, text, game);
  const hashtags = composeHashtags(game, text);
  const thumbnailText = composeThumb(hook, game);

  return { title, description, hashtags, thumbnailText };
}

function pickHook(text: string, story: RawStory): string {
  const eventText = story.story.beats.event?.evidence ?? "";
  if (includesTerm(text, ["ace"])) return "ACE";
  if (includesTerm(text, ["clutch", "1v3", "1v4", "1v5"])) return "CLUTCH";
  if (includesTerm(text, ["promo", "promotion"])) return "PROMO";
  if (includesTerm(eventText, EVENT_TERMS) && eventText.length < 28) {
    return eventText.replace(/['"]/g, "").toUpperCase();
  }
  const sentence = text
    .split(/[.!?]/)
    .map((s) => s.trim())
    .find((s) => s.length > 8 && s.length < 42);
  return sentence?.toUpperCase() ?? "LE MOMENT";
}

function composeTitle(hook: string, game: string | undefined, viral: number): string {
  const intensity = viral >= 80 ? "il n'y croit pas" : viral >= 65 ? "ça bascule" : "l'histoire complète";
  const gameBit = game && game !== "Just Chatting" ? ` | ${game}` : "";
  const title = `${hook} — ${intensity}${gameBit}`;
  return title.slice(0, 68);
}

function composeDescription(story: RawStory, text: string, game?: string): string {
  const why = story.story.whyInteresting;
  const tc = `${formatTimecode(story.startMs)} → ${formatTimecode(story.endMs)}`;
  const quote = text.split(/[.!?]/)[0]?.trim();
  const lines = [
    why,
    quote && quote.length > 20 ? `« ${quote.slice(0, 140)} »` : "",
    game ? `Session ${game} • ${tc}` : `Extrait VOD • ${tc}`,
    "Généré par Arc — on coupe une histoire, pas un cri.",
  ].filter(Boolean);
  return lines.join("\n\n");
}

function composeHashtags(game: string | undefined, text: string): string[] {
  const tags = new Set<string>([
    "#twitch",
    "#clips",
    "#viral",
    "#streamer",
    "#fyp",
  ]);
  if (game) {
    tags.add(`#${game.replace(/\s+/g, "")}`);
    if (game === "Valorant") tags.add("#ValorantClips");
    if (game === "League of Legends") tags.add("#LoL");
  }
  if (includesTerm(text, STAKE_TERMS)) tags.add("#clutch");
  if (includesTerm(text, ["ace"])) tags.add("#ace");
  if (includesTerm(text, CONCLUSION_TERMS)) tags.add("#gg");
  tags.add("#shorts");
  tags.add("#reels");
  tags.add("#tiktok");
  return [...tags].slice(0, 12);
}

function composeThumb(hook: string, game?: string): string {
  if (hook.length <= 14) return hook;
  if (game && ["ACE", "CLUTCH", "PROMO"].includes(hook)) return `${hook}`;
  return hook.split(/\s+/).slice(0, 3).join(" ").slice(0, 18);
}
