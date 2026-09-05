import path from "node:path";
import { ffmpeg } from "./ffmpeg";
import { writeAssSubtitles } from "./subtitles";
import type { ClipCandidate, TranscriptCue } from "@/lib/engine/types";

export async function renderClip(options: {
  vodPath: string;
  clip: ClipCandidate;
  cues: TranscriptCue[];
  outDir: string;
}): Promise<{ clipPath: string; thumbPath: string }> {
  const { vodPath, clip, cues, outDir } = options;
  const startSec = (clip.startMs / 1000).toFixed(3);
  const durationSec = (clip.durationMs / 1000).toFixed(3);
  const clipPath = path.join(outDir, `${clip.id}.mp4`);
  const thumbPath = path.join(outDir, `${clip.id}.jpg`);
  const assPath = await writeAssSubtitles(clip, cues, outDir);

  const zoom = clip.editPlan.layout === "face-priority" ? 1.22 : 1.1;
  const chain = [
    `scale=iw*${zoom}:ih*${zoom}`,
    "crop=ih*9/16:ih",
    "scale=720:1280",
  ];
  if (assPath) {
    const escaped = assPath.replace(/\\/g, "/").replace(/:/g, "\\:");
    chain.push(`subtitles=${escaped}`);
  }

  await ffmpeg(
    [
      "-ss",
      startSec,
      "-i",
      vodPath,
      "-t",
      durationSec,
      "-vf",
      chain.join(","),
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-ac",
      "2",
      "-movflags",
      "+faststart",
      clipPath,
    ],
    120_000,
  );

  const thumbSec = Math.max(
    0.2,
    ((clip.editPlan.punchInAtMs ?? clip.startMs) - clip.startMs) / 1000,
  );
  const safeTitle = clip.metadata.thumbnailText.replace(/[':]/g, " ").slice(0, 18);
  await ffmpeg(
    [
      "-ss",
      thumbSec.toFixed(2),
      "-i",
      clipPath,
      "-frames:v",
      "1",
      "-vf",
      `drawtext=text='${safeTitle}':fontcolor=white:fontsize=56:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h*0.16`,
      thumbPath,
    ],
    20_000,
  );

  return { clipPath, thumbPath };
}
