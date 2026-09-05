import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { sessionDir, sessionFile } from "./paths";
import type { SessionRecord } from "./engine/types";

export async function saveSession(session: SessionRecord): Promise<void> {
  await mkdir(sessionDir(session.id), { recursive: true });
  await writeFile(sessionFile(session.id), JSON.stringify(session, null, 2), "utf8");
}

export async function loadSession(id: string): Promise<SessionRecord | null> {
  try {
    const raw = await readFile(sessionFile(id), "utf8");
    return JSON.parse(raw) as SessionRecord;
  } catch {
    return null;
  }
}

export async function listSessions(): Promise<SessionRecord[]> {
  try {
    const dir = pathJoin();
    const ids = await readdir(dir, { withFileTypes: true });
    const sessions: SessionRecord[] = [];
    for (const entry of ids) {
      if (!entry.isDirectory()) continue;
      const session = await loadSession(entry.name);
      if (session) sessions.push(session);
    }
    return sessions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

function pathJoin() {
  return `${process.cwd()}/data/sessions`;
}
