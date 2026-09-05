import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzeSignals } from "./engine/analyze";
import { parseChat } from "./engine/chat";
import { parseTranscript } from "./engine/transcript";
import type { ChatEvent, PipelineStage, SessionRecord, TranscriptCue } from "./engine/types";
import { extractAudioEnergy } from "./media/audio-energy";
import { probeVideo } from "./media/probe";
import { renderClip } from "./media/render";
import { detectScenes } from "./media/scenes";
import { detectWebcamRegion } from "./media/webcam";
import { sessionDir } from "./paths";
import { loadSession, saveSession } from "./store";
import { enrichClipsWithAi } from "./ai-enrich";

const jobs = new Set<string>();

export async function runPipeline(sessionId: string): Promise<SessionRecord> {
  if (jobs.has(sessionId)) {
    const current = await loadSession(sessionId);
    if (current) return current;
  }
  jobs.add(sessionId);
  try {
    return await execute(sessionId);
  } finally {
    jobs.delete(sessionId);
  }
}

async function execute(sessionId: string): Promise<SessionRecord> {
  const session = await loadSession(sessionId);
  if (!session) throw new Error("Session introuvable");
  if (session.progress.stage === "ready") return session;
  if (session.source === "demo") {
    session.progress = { stage: "ready", message: "Session démo prête.", percent: 100 };
    await saveSession(session);
    return session;
  }
  if (!session.vodPath) throw new Error("Aucune VOD");

  const tick = async (stage: PipelineStage, message: string, percent: number) => {
    session.progress = { stage, message, percent };
    await saveSession(session);
  };

  await tick("probe", "Lecture de la VOD…", 8);
  const probe = await probeVideo(session.vodPath);
  session.durationMs = probe.durationMs;
  session.width = probe.width;
  session.height = probe.height;
  session.fps = probe.fps;
  session.hasAudio = probe.hasAudio;

  await tick("audio", "Courbe d'énergie audio…", 22);
  const audio = await extractAudioEnergy(session.vodPath, probe.durationMs);

  await tick("scenes", "Changements de scène…", 36);
  const scenes = await detectScenes(session.vodPath, probe.durationMs);

  await tick("reactions", "Recadrage visage / gameplay…", 48);
  const webcam = await detectWebcamRegion(session.vodPath);

  await tick("chat", "Chat Twitch / YouTube…", 55);
  let chat: ChatEvent[] = [];
  if (session.chatPath) {
    chat = parseChat(await readFile(session.chatPath, "utf8"));
  }

  await tick("transcript", "Transcription…", 64);
  let transcript: TranscriptCue[] = [];
  if (session.transcriptPath) {
    transcript = parseTranscript(
      await readFile(session.transcriptPath, "utf8"),
      path.basename(session.transcriptPath),
    );
  }

  await tick("stories", "Reconstruction des histoires (contexte → conclusion)…", 74);
  const analyzed = analyzeSignals(
    {
      durationMs: probe.durationMs,
      audio,
      chat,
      transcript,
      scenes,
      reactions: [],
    },
    { webcam, filename: session.filename },
  );

  session.game = analyzed.signals.game;
  session.stats = {
    analyzedMs: probe.durationMs,
    storyCount: analyzed.keep.length,
    screamRejected: analyzed.reject.filter((r) => /cri/i.test(r.reason)).length,
    chatEvents: chat.length,
    transcriptCues: transcript.length,
    sceneChanges: scenes.length,
  };
  session.rejected = analyzed.reject;

  await tick("render", "Montage vertical, sous-titres, miniatures…", 82);
  const outDir = path.join(sessionDir(session.id), "clips");
  await mkdir(outDir, { recursive: true });

  const rendered = [];
  for (const [index, clip] of analyzed.keep.entries()) {
    try {
      const media = await renderClip({
        vodPath: session.vodPath,
        clip,
        cues: transcript,
        outDir,
      });
      rendered.push({
        ...clip,
        media: {
          clipPath: path.relative(process.cwd(), media.clipPath),
          thumbPath: path.relative(process.cwd(), media.thumbPath),
        },
      });
    } catch (error) {
      console.warn("[arc] clip render failed", clip.id, error);
      rendered.push(clip);
    }
    const pct = 82 + Math.round(((index + 1) / Math.max(analyzed.keep.length, 1)) * 12);
    await tick("render", `Montage ${index + 1}/${analyzed.keep.length}…`, pct);
  }

  await tick("stories", "Titres, descriptions, hashtags…", 96);
  session.clips = await enrichClipsWithAi(rendered);

  session.progress = {
    stage: "ready",
    message: `${session.clips.length} histoires prêtes à publier.`,
    percent: 100,
  };
  await saveSession(session);
  return session;
}

export async function createSessionFromUpload(options: {
  vod: File;
  chat?: File | null;
  transcript?: File | null;
  gameTitle?: string;
}): Promise<SessionRecord> {
  const id = randomUUID();
  const dir = sessionDir(id);
  await mkdir(dir, { recursive: true });
  const vodPath = path.join(dir, safeName(options.vod.name) || "vod.mp4");
  await writeFileFromBlob(vodPath, options.vod);

  let chatPath: string | undefined;
  if (options.chat && options.chat.size > 0) {
    chatPath = path.join(dir, safeName(options.chat.name) || "chat.json");
    await writeFileFromBlob(chatPath, options.chat);
  }
  let transcriptPath: string | undefined;
  if (options.transcript && options.transcript.size > 0) {
    transcriptPath = path.join(dir, safeName(options.transcript.name) || "captions.srt");
    await writeFileFromBlob(transcriptPath, options.transcript);
  }

  const session: SessionRecord = {
    id,
    createdAt: new Date().toISOString(),
    filename: options.vod.name,
    durationMs: 0,
    width: 0,
    height: 0,
    fps: 0,
    hasAudio: true,
    source: "upload",
    vodPath,
    chatPath,
    transcriptPath,
    game: options.gameTitle
      ? { title: options.gameTitle, evidence: ["manual"] }
      : undefined,
    progress: { stage: "queued", message: "VOD reçue. Analyse en file.", percent: 2 },
    clips: [],
    rejected: [],
    stats: {
      analyzedMs: 0,
      storyCount: 0,
      screamRejected: 0,
      chatEvents: 0,
      transcriptCues: 0,
      sceneChanges: 0,
    },
  };
  await saveSession(session);
  return session;
}

export async function createFixtureSession(): Promise<SessionRecord> {
  const { generateFixtureVod } = await import("./media/fixture");
  const id = randomUUID();
  const dir = sessionDir(id);
  const files = await generateFixtureVod(dir);
  const session: SessionRecord = {
    id,
    createdAt: new Date().toISOString(),
    filename: "fixture-90s.mp4",
    durationMs: 90_000,
    width: 1920,
    height: 1080,
    fps: 24,
    hasAudio: true,
    source: "fixture",
    vodPath: files.vodPath,
    chatPath: files.chatPath,
    transcriptPath: files.transcriptPath,
    game: { title: "Valorant", genre: "tactical fps", evidence: ["fixture"] },
    progress: { stage: "queued", message: "Extrait synthétique généré.", percent: 4 },
    clips: [],
    rejected: [],
    stats: {
      analyzedMs: 0,
      storyCount: 0,
      screamRejected: 0,
      chatEvents: 0,
      transcriptCues: 0,
      sceneChanges: 0,
    },
  };
  await saveSession(session);
  return session;
}

async function writeFileFromBlob(dest: string, file: File): Promise<void> {
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(dest, buf);
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}
