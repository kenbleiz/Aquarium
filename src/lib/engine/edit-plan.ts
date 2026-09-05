import type { EditPlan, SessionSignals } from "./types";
import type { RawStory } from "./story-arc";

export function buildEditPlan(
  story: RawStory,
  _signals: SessionSignals,
  webcam?: { x: number; y: number; w: number; h: number },
): EditPlan {
  const zooms = [];
  const event = story.story.beats.event;
  const reaction = story.story.beats.reaction;

  if (event) {
    zooms.push({
      atMs: event.startMs,
      durationMs: Math.min(2200, event.endMs - event.startMs),
      factor: 1.18,
      reason: "punch-in sur l'événement",
    });
  }
  if (reaction) {
    zooms.push({
      atMs: reaction.startMs,
      durationMs: Math.min(2800, reaction.endMs - reaction.startMs),
      factor: 1.28,
      reason: "zoom visage / réaction",
    });
  }

  const layout: EditPlan["layout"] = webcam
    ? "split-cam-game"
    : story.story.beats.reaction && (story.story.beats.reaction.strength ?? 0) > 0.55
      ? "face-priority"
      : "gameplay-priority";

  return {
    layout,
    webcamRegion: webcam,
    zooms,
    subtitleMode: "dynamic",
    punchInAtMs: event?.startMs,
  };
}
