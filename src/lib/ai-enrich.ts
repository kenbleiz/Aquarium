import { generateText, Output } from "ai";
import { z } from "zod";
import type { ClipCandidate } from "./engine/types";

const clipSchema = z.object({
  clips: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      thumbnailText: z.string(),
      whyInteresting: z.string(),
    }),
  ),
});

export function aiEnabled(): boolean {
  return Boolean(process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN);
}

export async function enrichClipsWithAi(clips: ClipCandidate[]): Promise<ClipCandidate[]> {
  if (!aiEnabled() || clips.length === 0) return clips;

  try {
    const { output } = await generateText({
      model: "google/gemini-3.8-flash",
      output: Output.object({ schema: clipSchema }),
      prompt: `Tu es le directeur éditorial d'Arc, un moteur qui transforme des VOD de stream en clips.
Pour chaque clip, réécris titre, description, texte de miniature et la phrase "pourquoi c'est intéressant pour quelqu'un qui n'a PAS vu le stream".
Le titre doit donner l'enjeu, pas seulement le cri. Français, punchy, max 68 caractères.
Clips:
${JSON.stringify(
  clips.map((c) => ({
    id: c.id,
    title: c.metadata.title,
    why: c.story.whyInteresting,
    beats: Object.fromEntries(
      Object.entries(c.story.beats).map(([k, v]) => [k, v?.evidence ?? null]),
    ),
    score: c.viralScore,
  })),
  null,
  2,
)}`,
    });

    if (!output) return clips;
    const byId = new Map(output.clips.map((c) => [c.id, c]));
    return clips.map((clip) => {
      const next = byId.get(clip.id);
      if (!next) return clip;
      return {
        ...clip,
        story: { ...clip.story, whyInteresting: next.whyInteresting || clip.story.whyInteresting },
        metadata: {
          ...clip.metadata,
          title: next.title.slice(0, 68),
          description: next.description,
          thumbnailText: next.thumbnailText.slice(0, 18),
        },
      };
    });
  } catch (error) {
    console.warn("[arc] AI enrichment skipped", error);
    return clips;
  }
}
