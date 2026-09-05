export const STORY_BEATS = [
  "context",
  "tension",
  "event",
  "reaction",
  "conclusion",
] as const;

export type StoryBeatId = (typeof STORY_BEATS)[number];

export type PipelineStage =
  | "queued"
  | "probe"
  | "audio"
  | "scenes"
  | "transcript"
  | "chat"
  | "reactions"
  | "game"
  | "stories"
  | "render"
  | "ready"
  | "error";

export type ClipPlatform = "tiktok" | "shorts" | "reels";

export interface AudioSample {
  tMs: number;
  rms: number;
  peak: number;
}

export interface ChatEvent {
  tMs: number;
  user: string;
  text: string;
}

export interface TranscriptCue {
  startMs: number;
  endMs: number;
  text: string;
  speaker?: string;
}

export interface SceneChange {
  tMs: number;
  score: number;
}

export interface ReactionEvent {
  tMs: number;
  kind: "laugh" | "scream" | "shock" | "hype";
  strength: number;
}

export interface GameContext {
  title: string;
  genre?: string;
  evidence: string[];
}

export interface SessionSignals {
  durationMs: number;
  audio: AudioSample[];
  chat: ChatEvent[];
  transcript: TranscriptCue[];
  scenes: SceneChange[];
  reactions: ReactionEvent[];
  game?: GameContext;
}

export interface StoryBeat {
  id: StoryBeatId;
  startMs: number;
  endMs: number;
  strength: number;
  evidence: string;
}

export interface StoryArc {
  beats: Record<StoryBeatId, StoryBeat | null>;
  completeness: number;
  standaloneClarity: number;
  screamOnly: boolean;
  whyInteresting: string;
}

export interface EditPlan {
  layout: "split-cam-game" | "face-priority" | "gameplay-priority";
  webcamRegion?: { x: number; y: number; w: number; h: number };
  zooms: Array<{ atMs: number; durationMs: number; factor: number; reason: string }>;
  subtitleMode: "dynamic" | "none";
  punchInAtMs?: number;
}

export interface ClipMetadata {
  title: string;
  description: string;
  hashtags: string[];
  thumbnailText: string;
}

export interface ClipCandidate {
  id: string;
  startMs: number;
  endMs: number;
  durationMs: number;
  viralScore: number;
  peakIntensity: number;
  chatProof: number;
  story: StoryArc;
  metadata: ClipMetadata;
  editPlan: EditPlan;
  selected: boolean;
  media?: {
    clipPath?: string;
    thumbPath?: string;
  };
}

export interface PipelineProgress {
  stage: PipelineStage;
  message: string;
  percent: number;
  error?: string;
}

export interface SessionRecord {
  id: string;
  createdAt: string;
  filename: string;
  durationMs: number;
  width: number;
  height: number;
  fps: number;
  hasAudio: boolean;
  game?: GameContext;
  source: "upload" | "demo" | "fixture";
  vodPath?: string;
  chatPath?: string;
  transcriptPath?: string;
  progress: PipelineProgress;
  clips: ClipCandidate[];
  rejected: Array<{
    startMs: number;
    endMs: number;
    reason: string;
    viralScore: number;
  }>;
  stats: {
    analyzedMs: number;
    storyCount: number;
    screamRejected: number;
    chatEvents: number;
    transcriptCues: number;
    sceneChanges: number;
  };
}
