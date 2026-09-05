import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/store";
import { runPipeline } from "@/lib/pipeline";

export const maxDuration = 300;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await loadSession(id);
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(session);
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await runPipeline(id);
  return NextResponse.json(session);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await loadSession(id);
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = (await request.json()) as { selected?: string[] };
  if (body.selected) {
    const set = new Set(body.selected);
    session.clips = session.clips.map((clip) => ({
      ...clip,
      selected: set.has(clip.id),
    }));
    await saveSession(session);
  }
  return NextResponse.json(session);
}
