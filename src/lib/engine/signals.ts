import { CHAT_HYPE_TERMS, REACTION_TERMS, includesTerm, isMostlyScream } from "./lexicon";
import { movingAverage, normalizeMinMax, percentile } from "./math";
import { chatRatePerWindow } from "./chat";
import { textInRange } from "./transcript";
import type { ReactionEvent, SessionSignals } from "./types";

export const BIN_MS = 250;

export interface SignalTimeline {
  binMs: number;
  bins: number;
  excitement: number[];
  audio: number[];
  chat: number[];
  keywords: number[];
  reactions: number[];
}

export function inferReactions(signals: SessionSignals): ReactionEvent[] {
  const events: ReactionEvent[] = [];
  for (const sample of signals.audio) {
    if (sample.peak > 0.85 && sample.rms > 0.7) {
      events.push({ tMs: sample.tMs, kind: "scream", strength: sample.peak });
    }
  }
  for (const cue of signals.transcript) {
    const text = cue.text;
    if (isMostlyScream(text)) {
      events.push({ tMs: cue.startMs, kind: "scream", strength: 0.9 });
    } else if (includesTerm(text, ["mdr", "ptdr", "lol", "lmao", "haha", "ahah"])) {
      events.push({ tMs: cue.startMs, kind: "laugh", strength: 0.7 });
    } else if (includesTerm(text, REACTION_TERMS)) {
      events.push({
        tMs: cue.startMs,
        kind: includesTerm(text, ["let's go", "lets go", "gooo"]) ? "hype" : "shock",
        strength: 0.75,
      });
    }
  }
  return mergeNearbyReactions(events);
}

function mergeNearbyReactions(events: ReactionEvent[]): ReactionEvent[] {
  const sorted = [...events].sort((a, b) => a.tMs - b.tMs);
  const out: ReactionEvent[] = [];
  for (const event of sorted) {
    const last = out[out.length - 1];
    if (last && event.tMs - last.tMs < 1500 && event.kind === last.kind) {
      last.strength = Math.max(last.strength, event.strength);
    } else {
      out.push({ ...event });
    }
  }
  return out;
}

export function buildTimeline(signals: SessionSignals): SignalTimeline {
  const bins = Math.max(1, Math.ceil(signals.durationMs / BIN_MS));
  const audio = new Array<number>(bins).fill(0);
  const chat = new Array<number>(bins).fill(0);
  const keywords = new Array<number>(bins).fill(0);
  const reactions = new Array<number>(bins).fill(0);

  if (signals.audio.length) {
    const rms = normalizeMinMax(signals.audio.map((s) => s.rms));
    const peak = normalizeMinMax(signals.audio.map((s) => s.peak));
    for (let i = 0; i < signals.audio.length; i++) {
      const bin = Math.min(bins - 1, Math.max(0, Math.floor(signals.audio[i].tMs / BIN_MS)));
      audio[bin] = Math.max(audio[bin], rms[i] * 0.65 + peak[i] * 0.35);
    }
  }

  const chatCounts = chatRatePerWindow(signals.chat, signals.durationMs, BIN_MS);
  const chatNorm = normalizeMinMax(chatCounts);
  for (let i = 0; i < bins; i++) chat[i] = chatNorm[i] ?? 0;

  for (let i = 0; i < bins; i++) {
    const start = i * BIN_MS;
    const text = textInRange(signals.transcript, start, start + BIN_MS * 4);
    if (includesTerm(text, REACTION_TERMS) || includesTerm(text, CHAT_HYPE_TERMS)) {
      keywords[i] = 1;
    } else if (text.trim()) {
      keywords[i] = 0.15;
    }
  }

  for (const reaction of signals.reactions) {
    const bin = Math.min(bins - 1, Math.max(0, Math.floor(reaction.tMs / BIN_MS)));
    reactions[bin] = Math.max(reactions[bin], reaction.strength);
  }

  const mixed = audio.map((_, i) => {
    return (
      audio[i] * 0.34 +
      chat[i] * 0.28 +
      keywords[i] * 0.18 +
      reactions[i] * 0.2
    );
  });
  const excitement = movingAverage(mixed, 6);
  const floor = percentile(excitement, 0.35);
  const spanned = excitement.map((v) => Math.max(0, v - floor * 0.4));

  return {
    binMs: BIN_MS,
    bins,
    excitement: normalizeMinMax(spanned),
    audio,
    chat,
    keywords,
    reactions,
  };
}
