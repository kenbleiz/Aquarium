"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function HomeStudio() {
  const router = useRouter();
  const [vod, setVod] = useState<File | null>(null);
  const [chat, setChat] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<File | null>(null);
  const [game, setGame] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function postSession(mode?: "demo" | "fixture", form?: FormData) {
    const qs = mode ? `?mode=${mode}` : "";
    const res = await fetch(`/api/sessions${qs}`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(err.error || "Échec");
    }
    const data = (await res.json()) as { id: string };
    router.push(`/sessions/${data.id}`);
  }

  async function onUpload() {
    if (!vod) {
      toast.error("Dépose un MP4.");
      return;
    }
    setBusy("upload");
    try {
      const form = new FormData();
      form.set("vod", vod);
      if (chat) form.set("chat", chat);
      if (transcript) form.set("transcript", transcript);
      if (game) form.set("game", game);
      await postSession(undefined, form);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload impossible");
      setBusy(null);
    }
  }

  async function onMode(mode: "demo" | "fixture") {
    setBusy(mode);
    try {
      await postSession(mode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de lancer la session");
      setBusy(null);
    }
  }

  return (
    <div className="arc-grid min-h-full">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-baseline gap-3">
          <span className="text-lg font-semibold tracking-tight">Arc</span>
          <span className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Stream → Content Engine
          </span>
        </div>
        <p className="hidden text-sm text-muted-foreground sm:block">
          Des histoires, pas des cris.
        </p>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-12 px-6 pb-20 pt-6 lg:grid-cols-[1.15fr_0.85fr] lg:pt-10">
        <section className="space-y-8">
          <div className="space-y-4">
            <p className="text-sm font-medium text-primary">VOD brute → clips prêts à publier</p>
            <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              4 heures de stream. 10 à 30 histoires. Quelques minutes.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              Arc ne découpe pas le moment où quelqu&apos;un crie. Il reconstitue
              <span className="text-foreground"> contexte → tension → événement → réaction → conclusion</span>
              {" "}pour quelqu&apos;un qui n&apos;a pas vu le live.
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const file = [...e.dataTransfer.files].find((f) => f.name.toLowerCase().endsWith(".mp4"));
              if (file) setVod(file);
            }}
            className={`rounded-2xl border border-dashed p-8 transition ${
              drag ? "border-primary bg-primary/5" : "border-border bg-card/60"
            }`}
          >
            <Label htmlFor="vod" className="text-sm">
              Dépose la VOD MP4
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              {vod ? vod.name : "Glisse un fichier, ou clique pour parcourir."}
            </p>
            <Input
              id="vod"
              type="file"
              accept="video/mp4,.mp4"
              className="mt-4"
              onChange={(e) => setVod(e.target.files?.[0] ?? null)}
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="chat">Chat Twitch / YouTube (optionnel)</Label>
                <Input
                  id="chat"
                  type="file"
                  accept=".json,.txt,.log"
                  className="mt-1.5"
                  onChange={(e) => setChat(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <Label htmlFor="srt">Transcription SRT / VTT (optionnel)</Label>
                <Input
                  id="srt"
                  type="file"
                  accept=".srt,.vtt,.json,.txt"
                  className="mt-1.5"
                  onChange={(e) => setTranscript(e.target.files?.[0] ?? null)}
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="game">Jeu / contexte</Label>
              <Input
                id="game"
                placeholder="Valorant, Just Chatting…"
                className="mt-1.5"
                value={game}
                onChange={(e) => setGame(e.target.value)}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button onClick={onUpload} disabled={busy !== null}>
                {busy === "upload" ? "Envoi…" : "Analyser la VOD"}
              </Button>
              <Button variant="outline" onClick={() => onMode("fixture")} disabled={busy !== null}>
                {busy === "fixture" ? "Génération…" : "Analyser un extrait réel (90s)"}
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card/70 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ce que l&apos;IA lit en parallèle</p>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                "Vidéo et changements de scène",
                "Énergie audio et réactions du streamer",
                "Transcription",
                "Chat Twitch / YouTube",
                "Contexte du jeu",
                "Moments forts… seulement s'ils racontent quelque chose",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-card/70 p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Session démo 4h03</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Ranked night Valorant. 22 séquences scannées, 10 histoires retenues, 4 cris isolés écartés. Aucune VOD à uploader.
            </p>
            <Button className="mt-5" variant="secondary" onClick={() => onMode("demo")} disabled={busy !== null}>
              {busy === "demo" ? "Ouverture…" : "Ouvrir la session démo"}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              ["9:16", "TikTok · Shorts · Reels"],
              ["+score", "Potentiel viral"],
              ["1 clic", "Tu choisis quoi publier"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border bg-card/50 px-2 py-4">
                <p className="font-mono text-sm text-primary">{k}</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{v}</p>
              </div>
            ))}
          </div>
        </aside>
      </main>
    </div>
  );
}
