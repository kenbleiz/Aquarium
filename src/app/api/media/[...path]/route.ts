import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { DATA_DIR } from "@/lib/paths";

export async function GET(
  _request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  const rel = parts.join("/");
  if (rel.includes("..")) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const resolved = path.resolve(path.join(DATA_DIR, rel));
  if (!resolved.startsWith(path.resolve(DATA_DIR))) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  try {
    const info = await stat(resolved);
    if (!info.isFile()) throw new Error("not a file");
    const buf = await readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const type =
      ext === ".mp4"
        ? "video/mp4"
        : ext === ".jpg" || ext === ".jpeg"
          ? "image/jpeg"
          : "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Content-Length": String(info.size),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
