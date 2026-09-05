import { CHAT_HYPE_TERMS, includesTerm } from "./lexicon";
import type { ChatEvent } from "./types";

export function parseChat(raw: string): ChatEvent[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  try {
    const data = JSON.parse(trimmed) as unknown;
    const fromJson = parseChatJson(data);
    if (fromJson.length) return fromJson;
  } catch {
    // fall through to line parser
  }

  return parseChatLines(trimmed);
}

function parseChatJson(data: unknown): ChatEvent[] {
  if (Array.isArray(data)) {
    return data
      .map((row) => coerceChatRow(row))
      .filter((row): row is ChatEvent => row !== null);
  }
  if (!data || typeof data !== "object") return [];
  const obj = data as Record<string, unknown>;

  if (Array.isArray(obj.comments)) {
    return obj.comments
      .map((comment) => {
        if (!comment || typeof comment !== "object") return null;
        const c = comment as Record<string, unknown>;
        const offset =
          num(c.content_offset_seconds) ??
          num((c.contentOffsetSeconds as number | undefined) ?? undefined);
        const commenter = (c.commenter ?? c.commenter_name) as
          | Record<string, unknown>
          | string
          | undefined;
        const user =
          typeof commenter === "string"
            ? commenter
            : String(
                (commenter?.display_name as string | undefined) ??
                  (commenter?.name as string | undefined) ??
                  "viewer",
              );
        const message = c.message as Record<string, unknown> | string | undefined;
        const text =
          typeof message === "string"
            ? message
            : String((message?.body as string | undefined) ?? "");
        if (offset === undefined || !text) return null;
        return { tMs: Math.round(offset * 1000), user, text };
      })
      .filter((row): row is ChatEvent => row !== null);
  }

  if (Array.isArray(obj.replayChatItemAction) || Array.isArray(obj.actions)) {
    return [];
  }

  if (Array.isArray(obj.messages)) {
    return obj.messages
      .map((row) => coerceChatRow(row))
      .filter((row): row is ChatEvent => row !== null);
  }

  return [];
}

function coerceChatRow(row: unknown): ChatEvent | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const tMs =
    num(o.tMs) ??
    num(o.offsetMs) ??
    (num(o.t) !== undefined ? Math.round(num(o.t)! * 1000) : undefined) ??
    (num(o.time) !== undefined ? Math.round(num(o.time)! * 1000) : undefined) ??
    (num(o.content_offset_seconds) !== undefined
      ? Math.round(num(o.content_offset_seconds)! * 1000)
      : undefined) ??
    parseClock(String(o.timestamp ?? o.ts ?? ""));
  const user = String(o.user ?? o.username ?? o.author ?? o.name ?? "viewer");
  const text = String(o.text ?? o.message ?? o.body ?? o.content ?? "");
  if (tMs === undefined || !text) return null;
  return { tMs, user, text };
}

function parseChatLines(raw: string): ChatEvent[] {
  const events: ChatEvent[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const match =
      line.match(
        /^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+([^:]+):\s+(.+)$/,
      ) ?? line.match(/^(\d+(?:\.\d+)?)\s+([^:]+):\s+(.+)$/);
    if (!match) continue;
    const tMs = match[1].includes(":")
      ? parseClock(match[1])
      : Math.round(Number(match[1]) * 1000);
    if (tMs === undefined) continue;
    events.push({ tMs, user: match[2].trim(), text: match[3].trim() });
  }
  return events;
}

export function parseClock(value: string): number | undefined {
  const parts = value.trim().split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return undefined;
  if (parts.length === 3) {
    return Math.round((parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000);
  }
  if (parts.length === 2) {
    return Math.round((parts[0] * 60 + parts[1]) * 1000);
  }
  return undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

export function chatRatePerWindow(
  events: ChatEvent[],
  durationMs: number,
  windowMs: number,
): number[] {
  const bins = Math.max(1, Math.ceil(durationMs / windowMs));
  const counts = new Array<number>(bins).fill(0);
  for (const event of events) {
    const i = Math.min(bins - 1, Math.max(0, Math.floor(event.tMs / windowMs)));
    counts[i] += 1;
    if (includesTerm(event.text, CHAT_HYPE_TERMS)) counts[i] += 1.5;
  }
  return counts;
}
