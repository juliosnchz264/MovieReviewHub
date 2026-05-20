export type Rng = () => number;

// Mulberry32: tiny, well-mixed, deterministic. Same seed -> same activity.
export function makeRng(seed: number): Rng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = <T>(rng: Rng, arr: readonly T[]): T =>
  arr[Math.floor(rng() * arr.length)]!;

export function pickN<T>(rng: Rng, arr: readonly T[], n: number): T[] {
  if (n >= arr.length) return [...arr];
  const idx = new Set<number>();
  while (idx.size < n) idx.add(Math.floor(rng() * arr.length));
  return [...idx].map((i) => arr[i]!);
}

export function weightedPick<T>(
  rng: Rng,
  items: readonly T[],
  weights: readonly number[],
): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

export function shuffle<T>(rng: Rng, arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// Knuth's algorithm. Good enough for the small lambdas we use here.
export function poisson(rng: Rng, lambda: number): number {
  if (lambda <= 0) return 0;
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

export const chance = (rng: Rng, p: number): boolean => rng() < p;

export const clamp = (n: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, n));
