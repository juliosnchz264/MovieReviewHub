import { type Querier } from './db.ts';
import { type Rng, chance, clamp, shuffle } from './random.ts';
import { recencyBiased } from './timestamps.ts';
import {
  type ExistingState,
  type ReviewRow,
  type TargetType,
  type UserRow,
  targetKey,
} from './data.ts';
import { assignPersona, personas } from './personas.ts';

export interface LikeRow {
  user_id: number;
  target_type: TargetType;
  target_id: number;
  created_at: Date;
}

export interface LikeConfig {
  windowDays: number;
  viralReviewChance: number;
  maxLikesPerUser: number;
  baseLikeRate: number;     // fraction of user base that engages with a "normal" review
  viralLikeRate: number;    // fraction for viral reviews
}

export interface LikePlan {
  rows: LikeRow[];
  perReview: number[];
  viralTargets: Set<string>;
}

// Heuristic per-review popularity score in [0, ~1.5].
//   - Higher rating reviews get more love (mainstream behavior).
//   - Longer comments read as "effort", get a slight bump.
//   - Older reviews lose recency factor.
function popularityScore(r: ReviewRow, windowDays: number): number {
  const ageDays = Math.max(0, (Date.now() - r.created_at.getTime()) / 86_400_000);
  const ageFactor = clamp(1 - ageDays / (windowDays * 4), 0.15, 1);
  const ratingFactor = clamp((r.rating - 1) / 4, 0.1, 1);
  const lengthFactor = clamp(r.body_len / 600, 0.25, 1.2);
  return ageFactor * ratingFactor * lengthFactor;
}

// Probability a user likes a *given* review. Used inside the per-review sampling so
// budgets/personas modulate engagement realistically without scanning every (user, review).
export function likeProbability(
  baseLikeRate: number,
  viralLikeRate: number,
  isViral: boolean,
  score: number,
): number {
  const rate = isViral ? viralLikeRate : baseLikeRate;
  return clamp(rate * score, 0, 0.95);
}

export function planLikes(
  rng: Rng,
  users: UserRow[],
  reviews: ReviewRow[],
  existing: ExistingState,
  cfg: LikeConfig,
): LikePlan {
  const personaBudgetMultiplier = (uid: number, idx: number): number => {
    const p = personas[assignPersona(idx)];
    // budgetMultiplier scales global maxLikesPerUser by persona enthusiasm.
    return clamp(p.likeLambda / 30, 0.1, 2);
  };

  const userIndex = new Map<number, number>(users.map((u, i) => [u.id, i]));
  const perUserBudget = new Map<number, number>(
    users.map((u, i) => [u.id, Math.round(cfg.maxLikesPerUser * personaBudgetMultiplier(u.id, i))]),
  );

  const rows: LikeRow[] = [];
  const perReview: number[] = [];
  const viralTargets = new Set<string>();

  // Oldest first so old reviews accumulate more interactions (matches real engagement curves).
  const ordered = [...reviews].sort(
    (a, b) => a.created_at.getTime() - b.created_at.getTime(),
  );

  for (const r of ordered) {
    const k = targetKey(r.target_type, r.id);
    const isViral = chance(rng, cfg.viralReviewChance);
    if (isViral) viralTargets.add(k);
    const score = popularityScore(r, cfg.windowDays);
    const baseProb = likeProbability(cfg.baseLikeRate, cfg.viralLikeRate, isViral, score);

    // Pre-existing likers (from previous runs or organic activity) — do not duplicate.
    const existingLikers = existing.likesByTarget.get(k) ?? new Set<number>();

    const candidates = shuffle(rng, users).filter(
      (u) => u.id !== r.user_id && !existingLikers.has(u.id) && (perUserBudget.get(u.id) ?? 0) > 0,
    );

    const ageDays = Math.max(0, (Date.now() - r.created_at.getTime()) / 86_400_000);
    let added = 0;
    for (const u of candidates) {
      // Per-user persona tweak: enthusiastic personas slightly boost prob.
      const enthusiasm = personas[assignPersona(userIndex.get(u.id)!)].likeLambda / 30;
      const prob = clamp(baseProb * enthusiasm, 0, 0.97);
      if (!chance(rng, prob)) continue;
      rows.push({
        user_id: u.id,
        target_type: r.target_type,
        target_id: r.id,
        created_at: recencyBiased(rng, Math.max(1, Math.min(cfg.windowDays, ageDays + 1))),
      });
      perUserBudget.set(u.id, (perUserBudget.get(u.id) ?? 0) - 1);
      existingLikers.add(u.id);
      added++;
    }
    perReview.push(added);
  }

  return { rows, perReview, viralTargets };
}

export async function insertLikes(q: Querier, rows: LikeRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const placeholders: string[] = [];
    const values: unknown[] = [];
    let p = 0;
    for (const r of slice) {
      placeholders.push(`($${++p},$${++p},$${++p},$${++p})`);
      values.push(r.user_id, r.target_type, r.target_id, r.created_at);
    }
    const res = await q.query(
      `INSERT INTO review_likes (user_id, target_type, target_id, created_at)
       VALUES ${placeholders.join(',')}
       ON CONFLICT DO NOTHING`,
      values,
    );
    inserted += res.rowCount ?? 0;
  }
  return inserted;
}
