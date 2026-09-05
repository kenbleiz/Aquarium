import { ffmpeg } from "./ffmpeg";
import type { SceneChange } from "@/lib/engine/types";

export async function detectScenes(vodPath: string, durationMs: number): Promise<SceneChange[]> {
  try {
    const { stderr } = await ffmpeg(
      [
        "-i",
        vodPath,
        "-vf",
        "select='gt(scene,0.24)',showinfo",
        "-vsync",
        "vfr",
        "-f",
        "null",
        "-",
      ],
      Math.max(60_000, durationMs),
    );
    const scenes: SceneChange[] = [];
    const re = /pts_time:(\d+(?:\.\d+)?).*scene_score[:\s]+(\d+(?:\.\d+)?)/gi;
    const fallback = /pts_time:(\d+(?:\.\d+)?)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(stderr))) {
      scenes.push({
        tMs: Math.round(Number(match[1]) * 1000),
        score: Number(match[2]),
      });
    }
    if (!scenes.length) {
      while ((match = fallback.exec(stderr))) {
        if (stderr.slice(match.index, match.index + 80).includes("n:")) {
          scenes.push({ tMs: Math.round(Number(match[1]) * 1000), score: 0.3 });
        }
      }
    }
    return scenes;
  } catch {
    return [];
  }
}
