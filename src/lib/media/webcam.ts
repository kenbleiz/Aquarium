import { ffmpeg } from "./ffmpeg";

export async function detectWebcamRegion(
  vodPath: string,
  atMs = 8000,
): Promise<{ x: number; y: number; w: number; h: number } | undefined> {
  const w = 320;
  const h = 180;
  try {
    const { stdout } = await ffmpeg(
      [
        "-ss",
        (atMs / 1000).toFixed(2),
        "-i",
        vodPath,
        "-frames:v",
        "1",
        "-s",
        `${w}x${h}`,
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "pipe:1",
      ],
      20_000,
    );
    if (stdout.length < w * h * 3) return undefined;

    const corners = [
      { name: "tl", x0: 0, y0: 0 },
      { name: "tr", x0: w - 80, y0: 0 },
      { name: "bl", x0: 0, y0: h - 50 },
      { name: "br", x0: w - 80, y0: h - 50 },
    ] as const;

    let best: { x: number; y: number; score: number } | undefined;
    for (const corner of corners) {
      let skin = 0;
      let n = 0;
      for (let y = corner.y0; y < corner.y0 + 50; y++) {
        for (let x = corner.x0; x < corner.x0 + 80; x++) {
          const i = (y * w + x) * 3;
          const r = stdout[i];
          const g = stdout[i + 1];
          const b = stdout[i + 2];
          n += 1;
          if (r > 95 && g > 40 && b > 20 && r > g && r > b && r - g > 15) skin += 1;
        }
      }
      const score = skin / n;
      if (!best || score > best.score) {
        best = { x: corner.x0 / w, y: corner.y0 / h, score };
      }
    }
    if (!best || best.score < 0.08) return undefined;
    return { x: best.x, y: best.y, w: 80 / w, h: 50 / h };
  } catch {
    return undefined;
  }
}
