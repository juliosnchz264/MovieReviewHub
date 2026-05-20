import type { Rng } from './random.ts';

// Random instant in the last `windowDays` days, biased toward recency (powering raw uniform).
// Higher bias -> more concentrated near "now".
export function recencyBiased(rng: Rng, windowDays: number, bias = 2): Date {
  const u = rng();
  const offsetFrac = Math.pow(u, bias);
  const offsetMs = offsetFrac * windowDays * 86_400_000;
  return new Date(Date.now() - offsetMs);
}

// Replies must always be posted after their parent review.
// Returns anchor + uniform jitter up to `maxDays`, never in the future.
export function afterAnchor(rng: Rng, anchor: Date, maxDays: number): Date {
  const room = Math.max(0.001, (Date.now() - anchor.getTime()) / 86_400_000);
  const cap = Math.min(maxDays, room);
  const jitterMs = rng() * cap * 86_400_000;
  const stamp = anchor.getTime() + jitterMs + 60_000;
  return new Date(Math.min(stamp, Date.now() - 30_000));
}
