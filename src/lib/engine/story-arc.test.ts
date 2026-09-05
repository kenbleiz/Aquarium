import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analyzeSignals } from "./analyze";
import type { AudioSample, ChatEvent, SessionSignals, TranscriptCue } from "./types";

function audioEnvelope(durationMs: number, levelAt: (tMs: number) => number): AudioSample[] {
  const samples: AudioSample[] = [];
  for (let t = 0; t < durationMs; t += 250) {
    const level = levelAt(t);
    samples.push({ tMs: t, rms: level, peak: Math.min(1, level * 1.15) });
  }
  return samples;
}

function cue(startS: number, text: string, dur = 2.4): TranscriptCue {
  return { startMs: startS * 1000, endMs: (startS + dur) * 1000, text };
}

function chat(tS: number, user: string, text: string): ChatEvent {
  return { tMs: tS * 1000, user, text };
}

function rankedNight(): SessionSignals {
  const durationMs = 120_000;
  return {
    durationMs,
    audio: audioEnvelope(durationMs, (t) => {
      const s = t / 1000;
      if (s < 20) return 0.12;
      if (s < 35) return 0.12 + ((s - 20) / 15) * 0.45;
      if (s < 45) return 0.88;
      if (s < 56) return 0.55 - ((s - 45) / 11) * 0.3;
      if (s < 70) return 0.1;
      if (s < 78) return 0.99;
      if (s < 90) return 0.1;
      if (s < 98) return 0.2 + ((s - 90) / 8) * 0.5;
      if (s < 108) return 0.8;
      return 0.25;
    }),
    transcript: [
      cue(2, "Allez, c'est le round de promo, si on gagne on passe."),
      cue(8, "On est match point, faut pas throw là."),
      cue(18, "Il reste trois, je hold site."),
      cue(24, "Wait wait, j'entends B. Il est low."),
      cue(30, "1v3, clutch ou kick."),
      cue(36, "ACE ! ACE ! On l'a !"),
      cue(42, "OH PUTAIN j'y crois pas"),
      cue(48, "GG les gars, c'était chaud mais on l'a fait."),
      cue(54, "Voilà, promo secured."),
      cue(71, "AHHHHHHH"),
      cue(74, "AAAA"),
      cue(91, "Ok last round, eco ou force ?"),
      cue(96, "Je peek mid, attention."),
      cue(102, "Let's go, on convertit."),
      cue(106, "GG wp, that's how we close."),
    ],
    chat: [
      chat(6, "lina", "promo ???"),
      chat(19, "kai", "focus"),
      chat(32, "lina", "1v3 POG"),
      chat(36, "rex", "CLIP IT"),
      chat(37, "nova", "ACE ACE ACE"),
      chat(38, "kai", "POGGERS"),
      chat(39, "mia", "insane"),
      chat(40, "ben", "holy"),
      chat(47, "lina", "GG"),
      chat(72, "rex", "lol"),
      chat(94, "kai", "eco?"),
      chat(103, "mia", "Pog"),
      chat(106, "ben", "gg"),
    ],
    scenes: [
      { tMs: 1000, score: 0.4 },
      { tMs: 58_000, score: 0.5 },
      { tMs: 80_000, score: 0.4 },
    ],
    reactions: [],
    game: { title: "Valorant", genre: "tactical fps", evidence: ["ace", "clutch"] },
  };
}

describe("story engine prefers complete arcs over isolated screams", () => {
  it("keeps the promo clutch and rejects the 8s scream", () => {
    const { keep, reject } = analyzeSignals(rankedNight());

    assert.ok(keep.length >= 1, "expected at least one publishable story");
    const clutch = keep.find((clip) => clip.startMs < 20_000 && clip.endMs > 45_000);
    assert.ok(clutch, "expected a clip covering context → conclusion of the promo round");
    assert.equal(clutch.story.screamOnly, false);
    assert.ok(clutch.story.beats.context, "missing context beat");
    assert.ok(clutch.story.beats.tension, "missing tension beat");
    assert.ok(clutch.story.beats.event, "missing event beat");
    assert.ok(clutch.story.beats.reaction, "missing reaction beat");
    assert.ok(clutch.story.beats.conclusion, "missing conclusion beat");
    assert.ok(clutch.viralScore >= 70, `clutch score too low: ${clutch.viralScore}`);
    assert.ok(clutch.durationMs >= 28_000, "story too short to stand alone");
    assert.match(clutch.story.whyInteresting, /Histoire complète/i);

    const screamReject = reject.find(
      (item) => item.startMs >= 62_000 && item.startMs <= 80_000,
    );
    const screamKeep = keep.find((clip) => clip.startMs >= 68_000 && clip.endMs <= 82_000);
    assert.ok(
      screamReject || !screamKeep,
      "isolated scream should not be treated as a publishable story",
    );
    if (screamReject) {
      assert.match(screamReject.reason, /[Cc]ri|contexte|illisible/);
      assert.ok(screamReject.viralScore < clutch.viralScore);
    }
  });

  it("scores a complete second arc later in the VOD", () => {
    const { keep } = analyzeSignals(rankedNight());
    const closer = keep.find((clip) => clip.startMs >= 85_000);
    if (closer) {
      assert.equal(closer.story.screamOnly, false);
      assert.ok(closer.viralScore >= 55);
    }
  });
});

describe("viral score philosophy", () => {
  it("never lets a scream-only window outscore a five-beat story", () => {
    const { keep, reject } = analyzeSignals(rankedNight());
    const bestKeep = Math.max(...keep.map((c) => c.viralScore), 0);
    const bestScream = Math.max(
      ...reject.filter((r) => /cri/i.test(r.reason)).map((r) => r.viralScore),
      0,
    );
    assert.ok(bestKeep > bestScream);
  });
});
