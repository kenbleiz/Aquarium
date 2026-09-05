import { NextResponse } from "next/server";
import { createFixtureSession, createSessionFromUpload, runPipeline } from "@/lib/pipeline";
import { buildDemoSession } from "@/lib/demo-session";
import { listSessions, saveSession } from "@/lib/store";

export const maxDuration = 300;

export async function GET() {
  const sessions = await listSessions();
  return NextResponse.json(
    sessions.map((s) => ({
      id: s.id,
      filename: s.filename,
      createdAt: s.createdAt,
      durationMs: s.durationMs,
      source: s.source,
      stage: s.progress.stage,
      clipCount: s.clips.length,
    })),
  );
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");

  if (mode === "demo") {
    const session = buildDemoSession();
    await saveSession(session);
    return NextResponse.json({ id: session.id });
  }

  if (mode === "fixture") {
    const session = await createFixtureSession();
    void runPipeline(session.id);
    return NextResponse.json({ id: session.id });
  }

  const form = await request.formData();
  const vod = form.get("vod");
  if (!(vod instanceof File) || vod.size === 0) {
    return NextResponse.json({ error: "Dépose un fichier MP4." }, { status: 400 });
  }
  const chat = form.get("chat");
  const transcript = form.get("transcript");
  const gameTitle = String(form.get("game") ?? "").trim();
  const session = await createSessionFromUpload({
    vod,
    chat: chat instanceof File ? chat : null,
    transcript: transcript instanceof File ? transcript : null,
    gameTitle: gameTitle || undefined,
  });
  void runPipeline(session.id);
  return NextResponse.json({ id: session.id });
}
