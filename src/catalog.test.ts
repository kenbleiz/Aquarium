import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DECOR_SHOP,
  SPECIES,
  crabArt,
  decorArt,
  fishArt,
  piranhaArt,
  sharkArt,
} from "./catalog.js";
import type { Growth, Rarity, SpeciesId } from "./types.js";

test("each species has a compact facing sprite", () => {
  const rarities = Object.values(SPECIES).map((s) => s.rarities[0]!) as Rarity[];
  const ids = Object.keys(SPECIES) as SpeciesId[];
  for (const [i, id] of ids.entries()) {
    for (const growth of [0, 1, 2] as Growth[]) {
      const right = fishArt(rarities[i]!, 1, growth, id);
      const left = fishArt(rarities[i]!, -1, growth, id);
      assert.ok(right.length >= 1 && left.length >= 1, id);
      for (const line of [...right, ...left]) {
        assert.ok(line.length >= 2 && line.length <= 14, `${id} ${growth} ${line}`);
      }
    }
  }
});

test("decor and fauna glyphs stay readable", () => {
  for (const item of DECOR_SHOP) {
    const art = decorArt(item.kind, 0);
    assert.ok(art.lines.length >= 1);
    assert.ok(art.lines.every((l) => l.length <= 8));
  }
  assert.ok(sharkArt(1).length === 2);
  assert.ok(piranhaArt(-1).includes("<"));
  assert.ok(crabArt(1).includes("•"));
});
