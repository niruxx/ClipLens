export function humanTime(unixSeconds: number): string {
  const deltaMs = Date.now() - unixSeconds * 1000;
  const delta = deltaMs / 1000;
  if (delta < 5) return "just now";
  if (delta < 60) return `${Math.floor(delta)}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  if (delta < 86400) return `${Math.floor(delta / 3600)}h ago`;
  const days = Math.floor(delta / 86400);
  if (days < 7) return `${days}d ago`;
  return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function truncate(text: string, limit = 400): string {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit).trimEnd()}…`;
}

export function previewLine(text: string, limit = 280): string {
  const collapsed = text.split(/\s+/).join(" ");
  return truncate(collapsed, limit);
}
