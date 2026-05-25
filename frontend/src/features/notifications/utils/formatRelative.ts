/**
 * Lightweight relative time formatter so we don't pull in a heavy dep just
 * for the bell. Falls back to a localized date for anything older than a week.
 */
export function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const diffMs = Date.now() - ts;
  const diffMin = Math.round(diffMs / 60_000);

  if (diffMin < 1) return "now";
  if (diffMin < 60) return `${diffMin}min`;

  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;

  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;

  return new Date(iso).toLocaleDateString();
}
