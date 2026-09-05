import type { TranscriptCue } from "./types";
import { parseClock } from "./chat";

export function parseTranscript(raw: string, filename = "captions.srt"): TranscriptCue[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (filename.endsWith(".json") || trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return parseTranscriptJson(JSON.parse(trimmed));
    } catch {
      // fall through
    }
  }

  if (trimmed.includes("-->") || filename.endsWith(".vtt") || filename.endsWith(".srt")) {
    return parseSrtLike(trimmed);
  }

  return parsePlainLines(trimmed);
}

function parseTranscriptJson(data: unknown): TranscriptCue[] {
  if (Array.isArray(data)) {
    return data
      .map((row): TranscriptCue | null => {
        if (!row || typeof row !== "object") return null;
        const o = row as Record<string, unknown>;
        const startMs =
          num(o.startMs) ??
          (num(o.start) !== undefined ? Math.round(num(o.start)! * 1000) : undefined);
        const endMs =
          num(o.endMs) ??
          (num(o.end) !== undefined ? Math.round(num(o.end)! * 1000) : undefined) ??
          (startMs !== undefined ? startMs + 2000 : undefined);
        const text = String(o.text ?? o.word ?? "");
        if (startMs === undefined || !text) return null;
        return {
          startMs,
          endMs: endMs ?? startMs + 2000,
          text,
          speaker: typeof o.speaker === "string" ? o.speaker : undefined,
        };
      })
      .filter((row): row is TranscriptCue => row !== null);
  }
  if (data && typeof data === "object" && Array.isArray((data as { segments?: unknown }).segments)) {
    return parseTranscriptJson((data as { segments: unknown[] }).segments);
  }
  return [];
}

function parseSrtLike(raw: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  const blocks = raw.replace(/^\uFEFF?WEBVTT.*\n+/, "").split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.split(/\n/).filter((l) => l.trim() && !/^\d+$/.test(l.trim()));
    const timeLine = lines.find((l) => l.includes("-->"));
    if (!timeLine) continue;
    const [startRaw, endRaw] = timeLine.split("-->").map((s) => s.trim());
    const startMs = parseSrtTime(startRaw);
    const endMs = parseSrtTime(endRaw.split(" ")[0]);
    const text = lines
      .filter((l) => l !== timeLine)
      .join(" ")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (startMs === undefined || !text) continue;
    cues.push({ startMs, endMs: endMs ?? startMs + 2000, text });
  }
  return cues;
}

function parsePlainLines(raw: string): TranscriptCue[] {
  const cues: TranscriptCue[] = [];
  for (const line of raw.split(/\n/)) {
    const match = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(.+)$/);
    if (!match) continue;
    const startMs = parseClock(match[1]);
    if (startMs === undefined) continue;
    cues.push({ startMs, endMs: startMs + 2500, text: match[2].trim() });
  }
  return cues;
}

function parseSrtTime(value: string): number | undefined {
  const match = value.trim().match(/(\d+):(\d+):(\d+)[,.](\d+)/);
  if (match) {
    return (
      Number(match[1]) * 3600000 +
      Number(match[2]) * 60000 +
      Number(match[3]) * 1000 +
      Number(match[4].padEnd(3, "0").slice(0, 3))
    );
  }
  return parseClock(value);
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function cuesInRange(
  cues: TranscriptCue[],
  startMs: number,
  endMs: number,
): TranscriptCue[] {
  return cues.filter((cue) => cue.endMs >= startMs && cue.startMs <= endMs);
}

export function textInRange(
  cues: TranscriptCue[],
  startMs: number,
  endMs: number,
): string {
  return cuesInRange(cues, startMs, endMs)
    .map((cue) => cue.text)
    .join(" ")
    .trim();
}
