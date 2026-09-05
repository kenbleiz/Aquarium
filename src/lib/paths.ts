import path from "node:path";

export const DATA_DIR = path.join(process.cwd(), "data");

export function sessionDir(id: string): string {
  return path.join(DATA_DIR, "sessions", id);
}

export function sessionFile(id: string): string {
  return path.join(sessionDir(id), "session.json");
}
