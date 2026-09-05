import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { cuesInRange } from "@/lib/engine/transcript";
import type { ClipCandidate, TranscriptCue } from "@/lib/engine/types";

function assTime(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

export async function writeAssSubtitles(
  clip: ClipCandidate,
  cues: TranscriptCue[],
  destDir: string,
): Promise<string | undefined> {
  const relevant = cuesInRange(cues, clip.startMs, clip.endMs);
  if (!relevant.length) return undefined;

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Alignment, BorderStyle, Outline, Shadow, MarginL, MarginR, MarginV
Style: Arc,Arial Black,54,&H00FFFFFF,&H0000E5FF,&H00000000,&H64000000,-1,0,2,1,4,0,40,40,90

[Events]
Format: Layer, Start, End, Style, Text
`;

  const events = relevant
    .map((cue) => {
      const start = Math.max(0, cue.startMs - clip.startMs);
      const end = Math.max(start + 400, cue.endMs - clip.startMs);
      const text = cue.text.replace(/\n/g, "\\N").replace(/[{}]/g, "");
      return `Dialogue: 0,${assTime(start)},${assTime(end)},Arc,{\\an2\\fscx102\\fscy102}${text}`;
    })
    .join("\n");

  await mkdir(destDir, { recursive: true });
  const file = path.join(destDir, `${clip.id}.ass`);
  await writeFile(file, header + events, "utf8");
  return file;
}
