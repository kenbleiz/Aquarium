"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { STORY_BEATS, type ClipCandidate, type SessionRecord, type StoryBeatId } from "@/lib/engine/types";
import { formatDuration, formatTimecode } from "@/lib/engine/math";
import { mediaApiPath } from "@/lib/media-url";

const BEAT_LABEL: Record<StoryBeatId, string> = {
  context: "Contexte",
  tension: "Tension",
  event: "Événement",
  reaction: "Réaction",
  conclusion: "Conclusion",
};

export function SessionStudio({ id }: { id: string }) {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<ClipCandidate | null>(null);
  const [filter, setFilter] = useState<"all" | "selected" | "top">("all");

  useEffect(() => {
    let stop = false;
    async function poll() {
      const res = await fetch(`/api/sessions/${id}`, { cache: "no-store" });
      if (!res.ok) {
        setError("Session introuvable");
        return;
      }
      const data = (await res.json()) as SessionRecord;
      if (stop) return;
      setSession(data);
      if (data.progress.stage !== "ready" && data.progress.stage !== "error") {
        window.setTimeout(poll, 900);
      }
    }
    void poll();
    return () => {
      stop = true;
    };
  }, [id]);

  const visible = useMemo(() => {
    if (!session) return [];
    if (filter === "selected") return session.clips.filter((c) => c.selected);
    if (filter === "top") return session.clips.filter((c) => c.viralScore >= 80);
    return session.clips;
  }, [session, filter]);

  async function toggle(clip: ClipCandidate) {
    if (!session) return;
    const selected = session.clips
      .map((c) => (c.id === clip.id ? { ...c, selected: !c.selected } : c))
      .filter((c) => c.selected)
      .map((c) => c.id);
    const res = await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selected }),
    });
    if (res.ok) setSession((await res.json()) as SessionRecord);
  }

  function copyPack() {
    if (!session) return;
    const chosen = session.clips.filter((c) => c.selected);
    const text = chosen
      .map(
        (c) =>
          `${c.metadata.title}\n${c.metadata.description}\n${c.metadata.hashtags.join(" ")}\nScore ${c.viralScore} · ${formatTimecode(c.startMs)}–${formatTimecode(c.endMs)}\n`,
      )
      .join("\n---\n\n");
    void navigator.clipboard.writeText(text);
    toast.success(`${chosen.length} fiches copiées`);
  }

  if (error) {
    return (
      <div className="p-10">
        <p>{error}</p>
        <Button asChild className="mt-4">
          <Link href="/">Retour</Link>
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="arc-grid flex min-h-full items-center justify-center">
        <p className="text-sm text-muted-foreground">Ouverture du studio…</p>
      </div>
    );
  }

  const ready = session.progress.stage === "ready";

  return (
    <div className="arc-grid min-h-full">
      <header className="border-b border-border/70 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              Arc
            </Link>
            <h1 className="text-lg font-semibold tracking-tight">{session.filename}</h1>
            <p className="text-xs text-muted-foreground">
              {formatDuration(session.durationMs)} · {session.game?.title ?? "contexte à inférer"} ·{" "}
              {session.clips.length} histoires
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setFilter("all")}>
              Toutes
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFilter("top")}>
              Score ≥ 80
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFilter("selected")}>
              Sélection ({session.clips.filter((c) => c.selected).length})
            </Button>
            <Button size="sm" onClick={copyPack} disabled={!session.clips.some((c) => c.selected)}>
              Copier titres + hashtags
            </Button>
          </div>
        </div>
      </header>

      {!ready && (
        <div className="mx-auto w-full max-w-7xl px-6 py-8">
          <p className="text-sm font-medium">{session.progress.message}</p>
          <Progress value={session.progress.percent} className="mt-3" />
          <p className="mt-2 font-mono text-xs text-muted-foreground">{session.progress.stage}</p>
        </div>
      )}

      <main className="mx-auto grid w-full max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-5">
          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Signaux</p>
            <dl className="mt-3 space-y-2 text-sm">
              <Row k="Chat" v={String(session.stats.chatEvents)} />
              <Row k="Transcription" v={String(session.stats.transcriptCues)} />
              <Row k="Scènes" v={String(session.stats.sceneChanges)} />
              <Row k="Cris écartés" v={String(session.stats.screamRejected)} />
            </dl>
          </div>
          <div className="rounded-2xl border border-border bg-card/70 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pas un clip generator</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              On privilégie une histoire que quelqu&apos;un peut comprendre sans avoir regardé le stream.
            </p>
          </div>
          {session.rejected.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Écartés</p>
              <ul className="mt-3 space-y-3">
                {session.rejected.map((item) => (
                  <li key={`${item.startMs}-${item.reason}`} className="text-xs leading-5 text-muted-foreground">
                    <span className="font-mono text-foreground/80">
                      {formatTimecode(item.startMs)} · {item.viralScore}
                    </span>
                    <br />
                    {item.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              onOpen={() => setOpen(clip)}
              onToggle={() => toggle(clip)}
            />
          ))}
          {ready && visible.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun clip dans ce filtre.</p>
          )}
        </section>
      </main>

      <Dialog open={Boolean(open)} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {open && <ClipDetail clip={open} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-mono">{v}</dd>
    </div>
  );
}

function ClipCard({
  clip,
  onOpen,
  onToggle,
}: {
  clip: ClipCandidate;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const thumb = mediaApiPath(clip.media?.thumbPath);
  const video = mediaApiPath(clip.media?.clipPath);
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card/80">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-[9/16] max-h-[420px] w-full overflow-hidden bg-zinc-950">
          {video ? (
            <video
              src={video}
              poster={thumb}
              className="size-full object-cover"
              muted
              playsInline
              loop
              onMouseEnter={(e) => void e.currentTarget.play()}
              onMouseLeave={(e) => {
                e.currentTarget.pause();
                e.currentTarget.currentTime = 0;
              }}
            />
          ) : (
            <Storyboard clip={clip} />
          )}
          <div className="absolute top-3 left-3 rounded-full bg-black/70 px-2 py-1 font-mono text-xs text-primary">
            {clip.viralScore}
          </div>
          <div className="absolute top-3 right-3 rounded-full bg-black/70 px-2 py-1 font-mono text-[11px]">
            {formatTimecode(clip.startMs)}
          </div>
          <div className="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <p className="text-sm font-medium leading-5">{clip.metadata.title}</p>
          </div>
        </div>
      </button>
      <div className="space-y-3 p-3">
        <BeatBar clip={clip} />
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">{clip.story.whyInteresting}</p>
        <div className="flex items-center justify-between">
          <Badge variant={clip.selected ? "default" : "outline"}>
            {clip.selected ? "À publier" : "En attente"}
          </Badge>
          <Button size="sm" variant="ghost" onClick={onToggle}>
            {clip.selected ? "Retirer" : "Garder"}
          </Button>
        </div>
      </div>
    </article>
  );
}

function Storyboard({ clip }: { clip: ClipCandidate }) {
  return (
    <div className="flex size-full flex-col">
      <div className="flex h-[38%] items-center justify-center bg-zinc-800 text-[11px] tracking-wide text-zinc-400">
        CAM · REACTION
      </div>
      <div className="flex flex-1 items-end justify-center bg-zinc-900 px-4 pb-16">
        <p className="text-center text-sm font-semibold uppercase">{clip.metadata.thumbnailText}</p>
      </div>
    </div>
  );
}

function BeatBar({ clip }: { clip: ClipCandidate }) {
  const span = Math.max(1, clip.endMs - clip.startMs);
  return (
    <div className="flex h-2 overflow-hidden rounded-full">
      {STORY_BEATS.map((id) => {
        const beat = clip.story.beats[id];
        if (!beat) return <span key={id} className="w-[6%] bg-muted" />;
        const w = Math.max(8, ((beat.endMs - beat.startMs) / span) * 100);
        return <span key={id} className={`beat-${id}`} style={{ width: `${w}%` }} title={BEAT_LABEL[id]} />;
      })}
    </div>
  );
}

function ClipDetail({ clip }: { clip: ClipCandidate }) {
  const video = mediaApiPath(clip.media?.clipPath);
  return (
    <div className="space-y-5">
      <DialogHeader>
        <DialogTitle>{clip.metadata.title}</DialogTitle>
      </DialogHeader>
      {video && (
        <video src={video} controls className="max-h-[420px] w-full rounded-lg bg-black" playsInline />
      )}
      <p className="text-sm leading-6 text-muted-foreground">{clip.story.whyInteresting}</p>
      <ol className="space-y-2">
        {STORY_BEATS.map((id) => {
          const beat = clip.story.beats[id];
          return (
            <li key={id} className="flex gap-3 text-sm">
              <span className={`mt-1 size-2.5 shrink-0 rounded-full beat-${id}`} />
              <div>
                <p className="font-medium">{BEAT_LABEL[id]}</p>
                <p className="text-muted-foreground">{beat ? beat.evidence : "absent — arc incomplet"}</p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="rounded-xl bg-muted/50 p-4 text-sm leading-6 whitespace-pre-wrap">
        {clip.metadata.description}
      </div>
      <p className="text-xs text-muted-foreground">{clip.metadata.hashtags.join(" ")}</p>
      <p className="font-mono text-xs text-muted-foreground">
        {formatTimecode(clip.startMs)} → {formatTimecode(clip.endMs)} · {Math.round(clip.durationMs / 1000)}s ·
        viral {clip.viralScore}
      </p>
    </div>
  );
}
