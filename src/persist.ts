import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { PersistBlob } from "./types.js";

export async function loadState(file: string): Promise<PersistBlob | null> {
  try {
    const raw = await readFile(file, "utf8");
    const data = JSON.parse(raw) as PersistBlob;
    if (data?.version !== 1 || !Array.isArray(data.fish)) return null;
    return data;
  } catch {
    return null;
  }
}

export async function saveState(file: string, blob: PersistBlob): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  await writeFile(tmp, JSON.stringify(blob, null, 2), "utf8");
  await rename(tmp, file);
}
