import { ffmpeg } from "./ffmpeg";
import type { AudioSample } from "@/lib/engine/types";

export async function extractAudioEnergy(
  vodPath: string,
  durationMs: number,
): Promise<AudioSample[]> {
  const { stdout } = await ffmpeg(
    [
      "-i",
      vodPath,
      "-vn",
      "-ac",
      "1",
      "-ar",
      "8000",
      "-f",
      "s16le",
      "pipe:1",
    ],
    Math.max(60_000, durationMs / 2),
  );

  const samples: AudioSample[] = [];
  const window = 2000; // 250ms at 8kHz
  const view = new Int16Array(
    stdout.buffer,
    stdout.byteOffset,
    Math.floor(stdout.byteLength / 2),
  );

  for (let i = 0; i + window <= view.length; i += window) {
    let sumSq = 0;
    let peak = 0;
    for (let j = 0; j < window; j++) {
      const v = view[i + j] / 32768;
      sumSq += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    const rms = Math.sqrt(sumSq / window);
    samples.push({
      tMs: Math.round((i / 8000) * 1000),
      rms: Math.min(1, rms * 4.5),
      peak: Math.min(1, peak),
    });
  }

  if (!samples.length) {
    samples.push({ tMs: 0, rms: 0, peak: 0 });
  }
  return samples;
}
