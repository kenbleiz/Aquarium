import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ffmpeg } from "./ffmpeg";

export async function generateFixtureVod(outDir: string): Promise<{
  vodPath: string;
  chatPath: string;
  transcriptPath: string;
}> {
  await mkdir(outDir, { recursive: true });
  const vodPath = path.join(outDir, "fixture.mp4");
  const volume =
    "if(lt(t,20),0.08,if(lt(t,35),0.08+0.75*(t-20)/15,if(lt(t,50),0.95,if(lt(t,70),0.08,if(lt(t,78),1.0,0.1)))))";

  await ffmpeg(
    [
      "-f",
      "lavfi",
      "-i",
      "testsrc2=s=1920x1080:r=24:d=90,format=yuv420p",
      "-f",
      "lavfi",
      "-i",
      "sine=frequency=220:sample_rate=44100:duration=90",
      "-filter_complex",
      `[1:a]volume=eval=frame:volume='${volume}'[a]`,
      "-map",
      "0:v",
      "-map",
      "[a]",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-c:a",
      "aac",
      "-shortest",
      vodPath,
    ],
    60_000,
  );

  const chatPath = path.join(outDir, "chat.json");
  const transcriptPath = path.join(outDir, "captions.srt");

  await writeFile(
    chatPath,
    JSON.stringify(
      {
        comments: [
          { content_offset_seconds: 6, commenter: { display_name: "lina" }, message: { body: "promo ???" } },
          { content_offset_seconds: 19, commenter: { display_name: "kai" }, message: { body: "focus" } },
          { content_offset_seconds: 32, commenter: { display_name: "lina" }, message: { body: "1v3 POG" } },
          { content_offset_seconds: 36, commenter: { display_name: "rex" }, message: { body: "CLIP IT" } },
          { content_offset_seconds: 37, commenter: { display_name: "nova" }, message: { body: "ACE ACE ACE" } },
          { content_offset_seconds: 38, commenter: { display_name: "kai" }, message: { body: "POGGERS" } },
          { content_offset_seconds: 47, commenter: { display_name: "lina" }, message: { body: "GG" } },
          { content_offset_seconds: 72, commenter: { display_name: "rex" }, message: { body: "lol" } },
        ],
      },
      null,
      2,
    ),
  );

  await writeFile(
    transcriptPath,
    `1
00:00:02,000 --> 00:00:06,000
Allez, c'est le round de promo, si on gagne on passe.

2
00:00:08,000 --> 00:00:12,000
On est match point, faut pas throw là.

3
00:00:18,000 --> 00:00:22,000
Il reste trois, je hold site.

4
00:00:24,000 --> 00:00:28,000
Wait wait, j'entends B. Il est low.

5
00:00:30,000 --> 00:00:34,000
1v3, clutch ou kick.

6
00:00:36,000 --> 00:00:40,000
ACE ! ACE ! On l'a !

7
00:00:42,000 --> 00:00:46,000
OH PUTAIN j'y crois pas

8
00:00:48,000 --> 00:00:53,000
GG les gars, c'était chaud mais on l'a fait.

9
00:01:11,000 --> 00:01:16,000
AHHHHHHH
`,
  );

  return { vodPath, chatPath, transcriptPath };
}
