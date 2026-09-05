import { ffprobe } from "./ffmpeg";

export interface ProbeResult {
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
}

export async function probeVideo(path: string): Promise<ProbeResult> {
  const { stdout } = await ffprobe([
    "-v",
    "error",
    "-show_format",
    "-show_streams",
    "-print_format",
    "json",
    path,
  ]);
  const data = JSON.parse(stdout.toString("utf8")) as {
    format?: { duration?: string };
    streams?: Array<{
      codec_type?: string;
      width?: number;
      height?: number;
      avg_frame_rate?: string;
      duration?: string;
    }>;
  };
  const video = data.streams?.find((s) => s.codec_type === "video");
  const audio = data.streams?.find((s) => s.codec_type === "audio");
  const durationSec = Number(data.format?.duration ?? video?.duration ?? 0);
  const [num, den] = (video?.avg_frame_rate ?? "24/1").split("/").map(Number);
  const fps = den ? num / den : 24;
  return {
    durationMs: Math.round(durationSec * 1000),
    width: video?.width ?? 1920,
    height: video?.height ?? 1080,
    fps: Number.isFinite(fps) && fps > 0 ? fps : 24,
    hasAudio: Boolean(audio),
  };
}
