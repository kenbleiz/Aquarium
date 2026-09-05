import { clamp } from "./math";
import { durationFitness, type RawStory } from "./story-arc";

export function viralScore(story: RawStory): number {
  if (story.story.screamOnly) {
    return Math.round(
      clamp(
        story.peakIntensity * 18 +
          story.chatProof * 10 +
          durationFitness(story.endMs - story.startMs) * 8,
        8,
        46,
      ),
    );
  }

  const completeness = story.story.completeness;
  const standalone = story.story.standaloneClarity;
  const intensity = story.peakIntensity;
  const social = story.chatProof;
  const duration = durationFitness(story.endMs - story.startMs);
  const beatBonus = Object.values(story.story.beats).filter(Boolean).length >= 4 ? 6 : 0;

  const raw =
    completeness * 30 +
    standalone * 25 +
    intensity * 18 +
    social * 15 +
    duration * 12 +
    beatBonus;

  return Math.round(clamp(raw, 12, 98));
}

export function selectPublishable(
  stories: RawStory[],
  durationMs: number,
): { keep: Array<RawStory & { viralScore: number }>; reject: Array<RawStory & { viralScore: number; reason: string }> } {
  const scored = stories.map((story) => ({ ...story, viralScore: viralScore(story) }));
  const hours = durationMs / 3_600_000;
  const target = clamp(Math.round(hours * 6 + 4), 3, 30);

  const reject: Array<RawStory & { viralScore: number; reason: string }> = [];
  const eligible: Array<RawStory & { viralScore: number }> = [];

  for (const story of scored) {
    if (story.story.screamOnly) {
      reject.push({
        ...story,
        reason: "Cri isolé sans contexte — illisible pour quelqu'un qui n'a pas vu le stream.",
      });
      continue;
    }
    if (story.story.standaloneClarity < 0.32) {
      reject.push({
        ...story,
        reason: "Arc incomplet : le spectateur arrive au milieu sans enjeu.",
      });
      continue;
    }
    eligible.push(story);
  }

  eligible.sort((a, b) => b.viralScore - a.viralScore);
  const cutoff = eligible.length > target ? Math.max(55, eligible[target - 1]?.viralScore ?? 55) : 48;
  const keep = eligible.filter((s) => s.viralScore >= cutoff).slice(0, 30);

  for (const story of eligible) {
    if (!keep.includes(story)) {
      reject.push({ ...story, reason: "Score trop bas par rapport aux autres histoires de la session." });
    }
  }

  keep.sort((a, b) => a.startMs - b.startMs);
  return { keep, reject };
}
