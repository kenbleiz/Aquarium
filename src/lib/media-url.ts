export function mediaApiPath(rel?: string): string | undefined {
  if (!rel) return undefined;
  const stripped = rel.replace(/^data[\\/]/, "").replace(/\\/g, "/");
  return `/api/media/${stripped}`;
}
