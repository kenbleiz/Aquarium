import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseChat } from "./chat";
import { parseTranscript } from "./transcript";

describe("chat parsers", () => {
  it("reads Twitch Downloader JSON", () => {
    const events = parseChat(
      JSON.stringify({
        comments: [
          {
            content_offset_seconds: 12.5,
            commenter: { display_name: "Lina" },
            message: { body: "POGGERS clip that" },
          },
        ],
      }),
    );
    assert.equal(events.length, 1);
    assert.equal(events[0].user, "Lina");
    assert.equal(events[0].tMs, 12500);
  });

  it("reads timestamped IRC-like logs", () => {
    const events = parseChat("[0:01:02] kai: 1v3 POG\n[0:01:03] rex: CLIP IT");
    assert.equal(events.length, 2);
    assert.equal(events[0].tMs, 62000);
  });
});

describe("transcript parsers", () => {
  it("reads SRT", () => {
    const cues = parseTranscript(
      `1
00:00:02,000 --> 00:00:05,000
C'est le round de promo
`,
      "captions.srt",
    );
    assert.equal(cues[0].startMs, 2000);
    assert.match(cues[0].text, /promo/);
  });
});
