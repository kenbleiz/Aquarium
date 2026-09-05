import { randomUUID } from "node:crypto";
import type { ClipCandidate, SessionRecord, StoryArc, StoryBeatId } from "./engine/types";

function beat(
  id: StoryBeatId,
  start: number,
  end: number,
  strength: number,
  evidence: string,
) {
  return { id, startMs: start * 1000, endMs: end * 1000, strength, evidence };
}

function arc(partial: Partial<Record<StoryBeatId, ReturnType<typeof beat>>> & { why: string; completeness: number; standalone: number; scream?: boolean }): StoryArc {
  return {
    beats: {
      context: partial.context ?? null,
      tension: partial.tension ?? null,
      event: partial.event ?? null,
      reaction: partial.reaction ?? null,
      conclusion: partial.conclusion ?? null,
    },
    completeness: partial.completeness,
    standaloneClarity: partial.standalone,
    screamOnly: Boolean(partial.scream),
    whyInteresting: partial.why,
  };
}

function clip(opts: {
  start: number;
  end: number;
  score: number;
  title: string;
  thumb: string;
  description: string;
  why: string;
  story: StoryArc;
  selected?: boolean;
}): ClipCandidate {
  const startMs = opts.start * 1000;
  const endMs = opts.end * 1000;
  return {
    id: randomUUID(),
    startMs,
    endMs,
    durationMs: endMs - startMs,
    viralScore: opts.score,
    peakIntensity: opts.score / 100,
    chatProof: Math.min(1, opts.score / 90),
    story: { ...opts.story, whyInteresting: opts.why },
    metadata: {
      title: opts.title,
      description: opts.description,
      hashtags: ["#Valorant", "#Twitch", "#clutch", "#shorts", "#fyp", "#streamer", "#tiktok"],
      thumbnailText: opts.thumb,
    },
    editPlan: {
      layout: "split-cam-game",
      zooms: [
        { atMs: startMs + 18_000, durationMs: 2200, factor: 1.18, reason: "punch-in événement" },
        { atMs: startMs + 24_000, durationMs: 2600, factor: 1.28, reason: "zoom réaction" },
      ],
      subtitleMode: "dynamic",
      punchInAtMs: startMs + 20_000,
    },
    selected: opts.selected ?? opts.score >= 74,
  };
}

export function buildDemoSession(): SessionRecord {
  const clips: ClipCandidate[] = [
    clip({
      start: 18 * 60 + 12,
      end: 18 * 60 + 58,
      score: 91,
      title: "PROMO — le 1v3 qu'il n'aurait jamais dû tenter",
      thumb: "1V3 PROMO",
      description:
        "Histoire complète (Valorant) : round de promotion posé → la site se vide → clutch 1v3 → le chat explose → GG, on passe.\n\nQuelqu'un qui n'a pas vu le stream comprend l'enjeu en 40 secondes.",
      why: "Histoire complète (Valorant) : l'enjeu de la promo est posé → la pression monte en 1v3 → l'ace tombe → réaction live → conclusion GG.",
      story: arc({
        completeness: 0.92,
        standalone: 0.9,
        why: "",
        context: beat("context", 18 * 60 + 12, 18 * 60 + 22, 0.86, "c'est le round de promo"),
        tension: beat("tension", 18 * 60 + 22, 18 * 60 + 32, 0.8, "1v3, il est low"),
        event: beat("event", 18 * 60 + 32, 18 * 60 + 38, 0.95, "ACE"),
        reaction: beat("reaction", 18 * 60 + 38, 18 * 60 + 48, 0.9, "OH PUTAIN j'y crois pas"),
        conclusion: beat("conclusion", 18 * 60 + 48, 18 * 60 + 58, 0.78, "GG, promo secured"),
      }),
    }),
    clip({
      start: 41 * 60 + 4,
      end: 41 * 60 + 51,
      score: 84,
      title: "Il call le lurk… et se trompe de 4 secondes",
      thumb: "MAUVAIS CALL",
      description:
        "Une lecture de jeu fausse, un silence, puis la punition. Le clip raconte l'erreur, pas seulement la mort.",
      why: "Histoire complète : il explique sa read → le doute s'installe → le lurk le punit → rage contrôlée → 'j'étais sûr'.",
      story: arc({
        completeness: 0.84,
        standalone: 0.81,
        why: "",
        context: beat("context", 41 * 60 + 4, 41 * 60 + 14, 0.74, "ils n'ont plus de util"),
        tension: beat("tension", 41 * 60 + 14, 41 * 60 + 24, 0.77, "j'entends stairs"),
        event: beat("event", 41 * 60 + 24, 41 * 60 + 31, 0.88, "headshot adverse"),
        reaction: beat("reaction", 41 * 60 + 31, 41 * 60 + 41, 0.83, "NAN mais WHY"),
        conclusion: beat("conclusion", 41 * 60 + 41, 41 * 60 + 51, 0.7, "j'étais sûr de ma read"),
      }),
    }),
    clip({
      start: 67 * 60 + 20,
      end: 68 * 60 + 8,
      score: 88,
      title: "Le chat spoil le clutch — il gagne quand même",
      thumb: "CHAT SPOIL",
      description:
        "Le chat hurle l'info trop tôt. Lui joue sourde oreille. Le round se ferme quand même. Rare : le chat EST l'antagoniste.",
      why: "Histoire complète : le chat spoil → tension 'ne lis pas le chat' → clutch → explosion → 'je vous écoute plus'.",
      story: arc({
        completeness: 0.88,
        standalone: 0.86,
        why: "",
        context: beat("context", 67 * 60 + 20, 67 * 60 + 28, 0.7, "dernier round de la map"),
        tension: beat("tension", 67 * 60 + 28, 67 * 60 + 38, 0.85, "NE LIS PAS LE CHAT"),
        event: beat("event", 67 * 60 + 38, 67 * 60 + 45, 0.9, "defuse 0.4s"),
        reaction: beat("reaction", 67 * 60 + 45, 67 * 60 + 55, 0.87, "chat en feu"),
        conclusion: beat("conclusion", 67 * 60 + 55, 68 * 60 + 8, 0.72, "je vous écoute plus"),
      }),
    }),
    clip({
      start: 1 * 3600 + 12 * 60,
      end: 1 * 3600 + 12 * 60 + 44,
      score: 79,
      title: "Just Chatting : la storytime qui dérape en 40s",
      thumb: "STORYTIME",
      description:
        "Un 'petit truc marrant' devient une confession. Le montage garde le setup, pas seulement le punchline.",
      why: "Histoire complète (Just Chatting) : anecdote anodine → malaise → révélation → fou rire → 'bref'.",
      selected: true,
      story: arc({
        completeness: 0.8,
        standalone: 0.83,
        why: "",
        context: beat("context", 1 * 3600 + 12 * 60, 1 * 3600 + 12 * 60 + 10, 0.76, "petit truc marrant"),
        tension: beat("tension", 1 * 3600 + 12 * 60 + 10, 1 * 3600 + 12 * 60 + 20, 0.7, "j'aurais pas dû"),
        event: beat("event", 1 * 3600 + 12 * 60 + 20, 1 * 3600 + 12 * 60 + 26, 0.82, "la révélation"),
        reaction: beat("reaction", 1 * 3600 + 12 * 60 + 26, 1 * 3600 + 12 * 60 + 36, 0.8, "chat KEKW"),
        conclusion: beat("conclusion", 1 * 3600 + 12 * 60 + 36, 1 * 3600 + 12 * 60 + 44, 0.68, "bref on parle plus de ça"),
      }),
    }),
    clip({
      start: 1 * 3600 + 48 * 60 + 9,
      end: 1 * 3600 + 48 * 60 + 55,
      score: 86,
      title: "Il ragequit… puis unsub le rage",
      thumb: "RAGEQUIT",
      description:
        "La colère est le milieu de l'histoire, pas le clip. On voit pourquoi, le geste, puis le recul 8 secondes plus tard.",
      why: "Histoire complète : throw de mate → montée de rage → ragequit fake → rire nerveux → 'ok je reste'.",
      story: arc({
        completeness: 0.86,
        standalone: 0.8,
        why: "",
        context: beat("context", 1 * 3600 + 48 * 60 + 9, 1 * 3600 + 48 * 60 + 18, 0.73, "mate peek eco"),
        tension: beat("tension", 1 * 3600 + 48 * 60 + 18, 1 * 3600 + 48 * 60 + 28, 0.81, "je jure si on perd"),
        event: beat("event", 1 * 3600 + 48 * 60 + 28, 1 * 3600 + 48 * 60 + 33, 0.9, "il quitte la game"),
        reaction: beat("reaction", 1 * 3600 + 48 * 60 + 33, 1 * 3600 + 48 * 60 + 44, 0.84, "chat en PLS"),
        conclusion: beat("conclusion", 1 * 3600 + 48 * 60 + 44, 1 * 3600 + 48 * 60 + 55, 0.77, "ok je reste, désolé"),
      }),
    }),
    clip({
      start: 2 * 3600 + 7 * 60 + 40,
      end: 2 * 3600 + 8 * 60 + 22,
      score: 93,
      title: "Match point — silence, puis 4k",
      thumb: "4K SILENCE",
      description:
        "Le chat se tait tout seul. Rare. Le clip vend le silence comme tension, pas un cri dessus.",
      why: "Histoire complète : match point posé → silence volontaire → 4k → explosion retardée → 'vous avez géré'.",
      story: arc({
        completeness: 0.94,
        standalone: 0.91,
        why: "",
        context: beat("context", 2 * 3600 + 7 * 60 + 40, 2 * 3600 + 7 * 60 + 48, 0.88, "match point"),
        tension: beat("tension", 2 * 3600 + 7 * 60 + 48, 2 * 3600 + 8 * 60, 0.9, "chut. focus."),
        event: beat("event", 2 * 3600 + 8 * 60, 2 * 3600 + 8 * 60 + 7, 0.96, "4k"),
        reaction: beat("reaction", 2 * 3600 + 8 * 60 + 7, 2 * 3600 + 8 * 60 + 16, 0.93, "explosion chat + cri"),
        conclusion: beat("conclusion", 2 * 3600 + 8 * 60 + 16, 2 * 3600 + 8 * 60 + 22, 0.74, "vous avez géré"),
      }),
    }),
    clip({
      start: 2 * 3600 + 33 * 60,
      end: 2 * 3600 + 33 * 60 + 41,
      score: 72,
      title: "Le dono qui casse le clutch (et le sauve)",
      thumb: "DONO",
      description:
        "Un don TTS pile au peek. Ça aurait dû throw. Ça devient le gag du clip.",
      why: "Histoire complète : setup clutch → dono TTS → peek raté puis kill → 'merci pour le throw' → on convertit.",
      selected: true,
      story: arc({
        completeness: 0.76,
        standalone: 0.74,
        why: "",
        context: beat("context", 2 * 3600 + 33 * 60, 2 * 3600 + 33 * 60 + 8, 0.7, "eco round"),
        tension: beat("tension", 2 * 3600 + 33 * 60 + 8, 2 * 3600 + 33 * 60 + 18, 0.72, "je peek maintenant"),
        event: beat("event", 2 * 3600 + 33 * 60 + 18, 2 * 3600 + 33 * 60 + 24, 0.8, "TTS + kill"),
        reaction: beat("reaction", 2 * 3600 + 33 * 60 + 24, 2 * 3600 + 33 * 60 + 33, 0.77, "merci pour le throw"),
        conclusion: beat("conclusion", 2 * 3600 + 33 * 60 + 33, 2 * 3600 + 33 * 60 + 41, 0.65, "on convertit quand même"),
      }),
    }),
    clip({
      start: 3 * 3600 + 2 * 60 + 14,
      end: 3 * 3600 + 2 * 60 + 58,
      score: 81,
      title: "Il coach le viewer en call… le viewer clutch",
      thumb: "COACHING",
      description:
        "Pas son clutch : celui du pote. Le streamer devient commentateur. Ça marche hors contexte.",
      why: "Histoire complète : il prend le IGL → calls serrés → le viewer clutch → célébration déléguée → 'c'est toi le clip'.",
      story: arc({
        completeness: 0.82,
        standalone: 0.8,
        why: "",
        context: beat("context", 3 * 3600 + 2 * 60 + 14, 3 * 3600 + 2 * 60 + 24, 0.75, "je te coach, écoute"),
        tension: beat("tension", 3 * 3600 + 2 * 60 + 24, 3 * 3600 + 2 * 60 + 34, 0.78, "ne peek pas je te jure"),
        event: beat("event", 3 * 3600 + 2 * 60 + 34, 3 * 3600 + 2 * 60 + 41, 0.86, "clutch du viewer"),
        reaction: beat("reaction", 3 * 3600 + 2 * 60 + 41, 3 * 3600 + 2 * 60 + 50, 0.8, "C'EST TOI LE CLIP"),
        conclusion: beat("conclusion", 3 * 3600 + 2 * 60 + 50, 3 * 3600 + 2 * 60 + 58, 0.7, "je t'avais dit hold"),
      }),
    }),
    clip({
      start: 3 * 3600 + 26 * 60 + 5,
      end: 3 * 3600 + 26 * 60 + 49,
      score: 77,
      title: "Le bug hitreg qui devient une lore",
      thumb: "HITREG",
      description:
        "Trois balles, zéro hit, une théorie complotiste, puis le clip-bait assumé.",
      why: "Histoire complète : 'j'ai touché' → replay mental → explosion → théorie → 'clippez le complot'.",
      selected: false,
      story: arc({
        completeness: 0.74,
        standalone: 0.7,
        why: "",
        context: beat("context", 3 * 3600 + 26 * 60 + 5, 3 * 3600 + 26 * 60 + 14, 0.68, "wide peek mid"),
        tension: beat("tension", 3 * 3600 + 26 * 60 + 14, 3 * 3600 + 26 * 60 + 24, 0.66, "j'ai touché trois fois"),
        event: beat("event", 3 * 3600 + 26 * 60 + 24, 3 * 3600 + 26 * 60 + 30, 0.79, "mort + 0 dmg"),
        reaction: beat("reaction", 3 * 3600 + 26 * 60 + 30, 3 * 3600 + 26 * 60 + 40, 0.82, "C'EST IMPOSSIBLE"),
        conclusion: beat("conclusion", 3 * 3600 + 26 * 60 + 40, 3 * 3600 + 26 * 60 + 49, 0.64, "clippez le complot"),
      }),
    }),
    clip({
      start: 3 * 3600 + 51 * 60 + 30,
      end: 3 * 3600 + 52 * 60 + 18,
      score: 90,
      title: "Fin de stream : il relit le pire round à froid",
      thumb: "RECAP",
      description:
        "Le meilleur contenu n'est pas le live — c'est le debrief. Contexte, tension, événement, recul. Un court-métrage.",
      why: "Histoire complète : il rewind le throw → reconstitue → assume la faute → rire → 'demain on grimpe'.",
      story: arc({
        completeness: 0.9,
        standalone: 0.88,
        why: "",
        context: beat("context", 3 * 3600 + 51 * 60 + 30, 3 * 3600 + 51 * 60 + 40, 0.84, "on rewind le round 18"),
        tension: beat("tension", 3 * 3600 + 51 * 60 + 40, 3 * 3600 + 51 * 60 + 50, 0.8, "là je overthink"),
        event: beat("event", 3 * 3600 + 51 * 60 + 50, 3 * 3600 + 51 * 60 + 56, 0.78, "le peek gratuit"),
        reaction: beat("reaction", 3 * 3600 + 51 * 60 + 56, 3 * 3600 + 52 * 60 + 8, 0.76, "ptdr j'étais terrible"),
        conclusion: beat("conclusion", 3 * 3600 + 52 * 60 + 8, 3 * 3600 + 52 * 60 + 18, 0.85, "demain on grimpe"),
      }),
    }),
  ];

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    filename: "nova_ranked_night_4h03.mp4",
    durationMs: (4 * 3600 + 3 * 60) * 1000,
    width: 1920,
    height: 1080,
    fps: 60,
    hasAudio: true,
    source: "demo",
    game: { title: "Valorant", genre: "tactical fps", evidence: ["ace", "clutch", "promo"] },
    progress: {
      stage: "ready",
      message: "22 séquences scannées · 10 histoires retenues · 4 cris isolés écartés",
      percent: 100,
    },
    clips,
    rejected: [
      {
        startMs: (52 * 60 + 8) * 1000,
        endMs: (52 * 60 + 16) * 1000,
        viralScore: 31,
        reason: "Cri isolé sans contexte — illisible pour quelqu'un qui n'a pas vu le stream.",
      },
      {
        startMs: (1 * 3600 + 3 * 60) * 1000,
        endMs: (1 * 3600 + 3 * 60 + 11) * 1000,
        viralScore: 28,
        reason: "Pic audio sans enjeu : un jump scare, pas une histoire.",
      },
      {
        startMs: (2 * 3600 + 19 * 60) * 1000,
        endMs: (2 * 3600 + 19 * 60 + 9) * 1000,
        viralScore: 34,
        reason: "Arc incomplet : le spectateur arrive au milieu sans enjeu.",
      },
      {
        startMs: (3 * 3600 + 14 * 60) * 1000,
        endMs: (3 * 3600 + 14 * 60 + 12) * 1000,
        viralScore: 22,
        reason: "Cri isolé sans contexte — illisible pour quelqu'un qui n'a pas vu le stream.",
      },
    ],
    stats: {
      analyzedMs: (4 * 3600 + 3 * 60) * 1000,
      storyCount: clips.length,
      screamRejected: 4,
      chatEvents: 18420,
      transcriptCues: 3120,
      sceneChanges: 486,
    },
  };
}
