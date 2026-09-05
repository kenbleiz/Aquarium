import {
  CONCLUSION_TERMS,
  EVENT_TERMS,
  REACTION_TERMS,
  STAKE_TERMS,
  TENSION_TERMS,
  countTerms,
  includesTerm,
  isMostlyScream,
} from "./lexicon";
import {
  clamp,
  localMaxima,
  overlapRatio,
  percentile,
  slope,
} from "./math";
import { BIN_MS, buildTimeline, type SignalTimeline } from "./signals";
import { textInRange } from "./transcript";
import type {
  SessionSignals,
  StoryArc,
  StoryBeat,
  StoryBeatId,
} from "./types";

export interface RawStory {
  startMs: number;
  endMs: number;
  peakMs: number;
  peakIntensity: number;
  chatProof: number;
  story: StoryArc;
}

const MIN_CLIP_MS = 18_000;
const MAX_CLIP_MS = 95_000;
const IDEAL_MIN_MS = 28_000;
const IDEAL_MAX_MS = 72_000;

export function findStories(signals: SessionSignals): RawStory[] {
  if (signals.durationMs < 8_000) return [];
  const timeline = buildTimeline(signals);
  const threshold = Math.max(0.42, percentile(timeline.excitement, 0.82));
  const minDistance = Math.round(22_000 / BIN_MS);
  const peaks = localMaxima(timeline.excitement, { minDistance, threshold });

  const stories = peaks
    .map((peakBin) => expandStory(peakBin, timeline, signals))
    .filter((story): story is RawStory => story !== null)
    .map(snapToSilence);

  return nms(stories);
}

function expandStory(
  peakBin: number,
  timeline: SignalTimeline,
  signals: SessionSignals,
): RawStory | null {
  const peakMs = peakBin * BIN_MS;
  const peakVal = timeline.excitement[peakBin] ?? 0;

  let eventStartBin = peakBin;
  while (
    eventStartBin > 0 &&
    (timeline.excitement[eventStartBin - 1] ?? 0) > peakVal * 0.7 &&
    peakBin - eventStartBin < Math.round(8_000 / BIN_MS)
  ) {
    eventStartBin -= 1;
  }
  // The peak is the event. What follows is the reaction — do not swallow it.
  const eventEndBin = Math.min(
    timeline.bins - 1,
    peakBin + Math.round(2_400 / BIN_MS),
  );

  const event = beat(
    "event",
    eventStartBin * BIN_MS,
    (eventEndBin + 1) * BIN_MS,
    clamp(peakVal, 0, 1),
    evidenceFor("event", signals, eventStartBin * BIN_MS, (eventEndBin + 1) * BIN_MS),
  );

  const reaction = findReaction(event, timeline, signals);
  const tension = findTension(event, timeline, signals);
  const context = findContext(tension ?? event, timeline, signals);
  const conclusion = findConclusion(reaction ?? event, timeline, signals);

  const startMs = (context ?? tension ?? event).startMs;
  const endMs = (conclusion ?? reaction ?? event).endMs;
  const durationMs = endMs - startMs;
  if (durationMs < MIN_CLIP_MS || durationMs > MAX_CLIP_MS) {
    if (durationMs < MIN_CLIP_MS) {
      const paddedStart = Math.max(0, endMs - IDEAL_MIN_MS);
      const padded = buildArc({
        context,
        tension,
        event,
        reaction,
        conclusion,
        startMs: paddedStart,
        endMs,
        signals,
      });
      if (endMs - paddedStart < MIN_CLIP_MS) return null;
      return pack(paddedStart, endMs, peakMs, peakVal, signals, padded);
    }
    return null;
  }

  const story = buildArc({
    context,
    tension,
    event,
    reaction,
    conclusion,
    startMs,
    endMs,
    signals,
  });
  return pack(startMs, endMs, peakMs, peakVal, signals, story);
}

function findReaction(
  event: StoryBeat,
  timeline: SignalTimeline,
  signals: SessionSignals,
): StoryBeat | null {
  const startMs = event.endMs;
  const endMs = Math.min(signals.durationMs, event.endMs + 12_000);
  const text = textInRange(signals.transcript, startMs, endMs);
  const chatHits = signals.chat.filter((c) => c.tMs >= startMs && c.tMs <= endMs).length;
  const reactionHits = signals.reactions.filter(
    (r) => r.tMs >= startMs && r.tMs <= endMs + 800,
  );
  const energy = meanRange(timeline.excitement, startMs, endMs);
  const lexical = includesTerm(text, REACTION_TERMS) || isMostlyScream(text);
  const strength = clamp(
    energy * 0.35 +
      (reactionHits[0]?.strength ?? 0) * 0.3 +
      (lexical ? 0.25 : 0) +
      Math.min(0.2, chatHits / 20),
    0,
    1,
  );
  if (strength < 0.18) return null;
  return beat(
    "reaction",
    startMs,
    endMs,
    strength,
    evidenceFor("reaction", signals, startMs, endMs),
  );
}

function findTension(
  event: StoryBeat,
  timeline: SignalTimeline,
  signals: SessionSignals,
): StoryBeat | null {
  const endMs = event.startMs;
  const startMs = Math.max(0, event.startMs - 25_000);
  const values = sliceRange(timeline.excitement, startMs, endMs);
  const rising = slope(values) > 0.0004 || (values.at(-1) ?? 0) > (values[0] ?? 0) + 0.12;
  const text = textInRange(signals.transcript, startMs, endMs);
  const lexical = includesTerm(text, TENSION_TERMS) || includesTerm(text, STAKE_TERMS);
  const strength = clamp((rising ? 0.45 : 0.1) + (lexical ? 0.35 : 0) + meanRange(timeline.excitement, startMs, endMs) * 0.25, 0, 1);
  if (strength < 0.22) return null;
  return beat("tension", startMs, endMs, strength, evidenceFor("tension", signals, startMs, endMs));
}

function findContext(
  after: StoryBeat,
  timeline: SignalTimeline,
  signals: SessionSignals,
): StoryBeat | null {
  const endMs = after.startMs;
  const sceneBound = [...signals.scenes]
    .map((s) => s.tMs)
    .filter((t) => t < endMs && endMs - t < 40_000)
    .sort((a, b) => a - b)
    .at(-1);
  const startMs = Math.max(0, sceneBound ?? endMs - 32_000);
  if (endMs - startMs < 6_000) return null;
  const text = textInRange(signals.transcript, startMs, endMs);
  const stake = countTerms(text, STAKE_TERMS);
  const speech = text.split(/\s+/).filter(Boolean).length;
  const energy = meanRange(timeline.excitement, startMs, endMs);
  const strength = clamp(
    Math.min(0.4, speech / 40) + Math.min(0.45, stake * 0.18) + (1 - energy) * 0.15,
    0,
    1,
  );
  if (strength < 0.2 && stake === 0 && speech < 8) return null;
  return beat("context", startMs, endMs, strength, evidenceFor("context", signals, startMs, endMs));
}

function findConclusion(
  after: StoryBeat,
  timeline: SignalTimeline,
  signals: SessionSignals,
): StoryBeat | null {
  const startMs = after.endMs;
  const endMs = Math.min(signals.durationMs, after.endMs + 14_000);
  const text = textInRange(signals.transcript, startMs, endMs);
  const falling =
    meanRange(timeline.excitement, startMs, startMs + 4000) >
    meanRange(timeline.excitement, endMs - 4000, endMs);
  const lexical = includesTerm(text, CONCLUSION_TERMS);
  const strength = clamp((falling ? 0.35 : 0.08) + (lexical ? 0.45 : 0) + Math.min(0.2, text.length / 180), 0, 1);
  if (strength < 0.22) return null;
  return beat("conclusion", startMs, endMs, strength, evidenceFor("conclusion", signals, startMs, endMs));
}

function buildArc(args: {
  context: StoryBeat | null;
  tension: StoryBeat | null;
  event: StoryBeat;
  reaction: StoryBeat | null;
  conclusion: StoryBeat | null;
  startMs: number;
  endMs: number;
  signals: SessionSignals;
}): StoryArc {
  const beats: StoryArc["beats"] = {
    context: args.context,
    tension: args.tension,
    event: args.event,
    reaction: args.reaction,
    conclusion: args.conclusion,
  };
  const present = Object.values(beats).filter(Boolean) as StoryBeat[];
  const completeness =
    present.reduce((sum, beat) => sum + beat.strength, 0) / 5;
  const fullText = textInRange(args.signals.transcript, args.startMs, args.endMs);
  const eventText = textInRange(
    args.signals.transcript,
    args.event.startMs,
    args.event.endMs,
  );
  const screamOnly =
    isMostlyScream(eventText) &&
    (args.context?.strength ?? 0) < 0.28 &&
    (args.conclusion?.strength ?? 0) < 0.22 &&
    countTerms(fullText, STAKE_TERMS) === 0;

  const wordCount = fullText.split(/\s+/).filter(Boolean).length;
  const stake = countTerms(fullText, STAKE_TERMS);
  const standaloneClarity = clamp(
    (args.context ? 0.28 : 0) +
      (args.tension ? 0.12 : 0) +
      (args.event ? 0.16 : 0) +
      (args.reaction ? 0.12 : 0) +
      (args.conclusion ? 0.12 : 0) +
      Math.min(0.14, wordCount / 80) +
      Math.min(0.12, stake * 0.06) -
      (screamOnly ? 0.4 : 0),
    0,
    1,
  );

  return {
    beats,
    completeness,
    standaloneClarity,
    screamOnly,
    whyInteresting: whyInteresting(beats, fullText, args.signals.game?.title),
  };
}

function whyInteresting(
  beats: StoryArc["beats"],
  transcript: string,
  game?: string,
): string {
  if (!beats.context && !beats.tension) {
    return "Pic d'énergie isolé : spectaculaire pour qui était déjà là, illisible pour quelqu'un qui débarque.";
  }
  const gameBit = game ? ` (${game})` : "";
  const ctx = beats.context?.evidence ?? "une situation se met en place";
  const tens = beats.tension
    ? "la pression monte"
    : "le rythme s'accélère";
  const evt = beats.event?.evidence || "l'action bascule";
  const react = beats.reaction
    ? "le streamer et le chat réagissent"
    : "la salle encaisse le coup";
  const end = beats.conclusion
    ? beats.conclusion.evidence
    : "le moment se referme";
  const quote = transcript.split(/[.!?]/)[0]?.trim();
  const hook = quote && quote.length > 12 && quote.length < 90 ? ` « ${quote} »` : "";
  return `Histoire complète${gameBit} : ${ctx} → ${tens} → ${evt} → ${react} → ${end}.${hook}`;
}

function evidenceFor(
  id: StoryBeatId,
  signals: SessionSignals,
  startMs: number,
  endMs: number,
): string {
  const text = textInRange(signals.transcript, startMs, endMs);
  const snippet = text.replace(/\s+/g, " ").trim().slice(0, 90);
  const chatN = signals.chat.filter((c) => c.tMs >= startMs && c.tMs <= endMs).length;
  if (id === "event") {
    if (includesTerm(text, EVENT_TERMS)) return snippet || "le coup qui fait basculer le round";
    return snippet || "pic d'action";
  }
  if (id === "reaction") {
    if (snippet) return snippet;
    if (chatN > 8) return `explosion du chat (${chatN} messages)`;
    return "réaction live";
  }
  if (id === "context") {
    if (includesTerm(text, STAKE_TERMS)) return snippet || "l'enjeu est posé";
    return snippet || "le spectateur comprend la situation";
  }
  if (id === "tension") {
    return snippet || "la fenêtre se resserre";
  }
  return snippet || "chute / punchline";
}

function beat(
  id: StoryBeatId,
  startMs: number,
  endMs: number,
  strength: number,
  evidence: string,
): StoryBeat {
  return { id, startMs, endMs: Math.max(endMs, startMs + 400), strength, evidence };
}

function pack(
  startMs: number,
  endMs: number,
  peakMs: number,
  peakIntensity: number,
  signals: SessionSignals,
  story: StoryArc,
): RawStory {
  const chatIn = signals.chat.filter((c) => c.tMs >= startMs && c.tMs <= endMs);
  const hype = chatIn.filter((c) =>
    includesTerm(c.text, ["pog", "clip", "wtf", "insane", "gg", "holy"]),
  ).length;
  const chatProof = clamp(chatIn.length / 40 + hype / 12, 0, 1);
  return {
    startMs,
    endMs,
    peakMs,
    peakIntensity,
    chatProof,
    story,
  };
}

function snapToSilence(story: RawStory): RawStory {
  return story;
}

function nms(stories: RawStory[]): RawStory[] {
  const ranked = [...stories].sort(
    (a, b) => scoreForNms(b) - scoreForNms(a),
  );
  const kept: RawStory[] = [];
  for (const story of ranked) {
    const overlaps = kept.some(
      (other) =>
        overlapRatio(story.startMs, story.endMs, other.startMs, other.endMs) > 0.42,
    );
    if (!overlaps) kept.push(story);
  }
  return kept.sort((a, b) => a.startMs - b.startMs);
}

function scoreForNms(story: RawStory): number {
  if (story.story.screamOnly) return story.peakIntensity * 0.25;
  return (
    story.story.completeness * 0.45 +
    story.story.standaloneClarity * 0.4 +
    story.peakIntensity * 0.15
  );
}

function sliceRange(values: number[], startMs: number, endMs: number): number[] {
  const a = Math.max(0, Math.floor(startMs / BIN_MS));
  const b = Math.min(values.length, Math.ceil(endMs / BIN_MS));
  return values.slice(a, Math.max(a + 1, b));
}

function meanRange(values: number[], startMs: number, endMs: number): number {
  const slice = sliceRange(values, startMs, endMs);
  if (!slice.length) return 0;
  return slice.reduce((s, v) => s + v, 0) / slice.length;
}

export function durationFitness(durationMs: number): number {
  if (durationMs < MIN_CLIP_MS || durationMs > MAX_CLIP_MS) return 0;
  if (durationMs >= IDEAL_MIN_MS && durationMs <= IDEAL_MAX_MS) return 1;
  if (durationMs < IDEAL_MIN_MS) {
    return clamp((durationMs - MIN_CLIP_MS) / (IDEAL_MIN_MS - MIN_CLIP_MS), 0, 1);
  }
  return clamp((MAX_CLIP_MS - durationMs) / (MAX_CLIP_MS - IDEAL_MAX_MS), 0, 1);
}

export { MIN_CLIP_MS, MAX_CLIP_MS };
