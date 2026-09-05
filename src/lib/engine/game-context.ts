import { GAME_HINTS, countTerms } from "./lexicon";
import { textInRange } from "./transcript";
import type { GameContext, SessionSignals } from "./types";

export function inferGameContext(
  signals: Pick<SessionSignals, "transcript" | "chat" | "durationMs">,
  filename = "",
): GameContext | undefined {
  const corpus = [
    filename,
    textInRange(signals.transcript, 0, signals.durationMs),
    signals.chat
      .slice(0, 400)
      .map((c) => c.text)
      .join(" "),
  ]
    .join(" ")
    .toLowerCase();

  let best: { hint: (typeof GAME_HINTS)[number]; score: number } | undefined;
  for (const hint of GAME_HINTS) {
    const score = countTerms(corpus, hint.terms) + (corpus.includes(hint.title.toLowerCase()) ? 3 : 0);
    if (score === 0) continue;
    if (!best || score > best.score) best = { hint, score };
  }
  if (!best) return undefined;
  return {
    title: best.hint.title,
    genre: best.hint.genre,
    evidence: best.hint.terms.filter((term) => corpus.includes(term)).slice(0, 6),
  };
}
