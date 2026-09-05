import { randomUUID } from "node:crypto";
import { buildEditPlan } from "./edit-plan";
import { inferGameContext } from "./game-context";
import { buildMetadata } from "./metadata";
import { inferReactions } from "./signals";
import { findStories, type RawStory } from "./story-arc";
import type { ClipCandidate, SessionSignals } from "./types";
import { selectPublishable } from "./viral-score";

export function analyzeSignals(
  input: SessionSignals,
  options?: { webcam?: { x: number; y: number; w: number; h: number }; filename?: string },
): {
  signals: SessionSignals;
  keep: ClipCandidate[];
  reject: Array<{ startMs: number; endMs: number; reason: string; viralScore: number }>;
} {
  const signals: SessionSignals = {
    ...input,
    reactions: input.reactions.length ? input.reactions : inferReactions(input),
    game: input.game ?? inferGameContext(input, options?.filename),
  };

  const stories = findStories(signals);
  const { keep, reject } = selectPublishable(stories, signals.durationMs);

  return {
    signals,
    keep: keep.map((story) => toClip(story, signals, options?.webcam)),
    reject: reject.map((story) => ({
      startMs: story.startMs,
      endMs: story.endMs,
      reason: story.reason,
      viralScore: story.viralScore,
    })),
  };
}

function toClip(
  story: RawStory & { viralScore: number },
  signals: SessionSignals,
  webcam?: { x: number; y: number; w: number; h: number },
): ClipCandidate {
  return {
    id: randomUUID(),
    startMs: story.startMs,
    endMs: story.endMs,
    durationMs: story.endMs - story.startMs,
    viralScore: story.viralScore,
    peakIntensity: story.peakIntensity,
    chatProof: story.chatProof,
    story: story.story,
    metadata: buildMetadata(story, signals, story.viralScore),
    editPlan: buildEditPlan(story, signals, webcam),
    selected: story.viralScore >= 70,
  };
}
