import type { Querier } from './db.ts';
import { type Rng, chance, clamp, poisson, shuffle } from './random.ts';
import { afterAnchor } from './timestamps.ts';
import { generateReply, pickTone } from './content.ts';
import {
  SEED_TAG,
  type ExistingState,
  type ReviewRow,
  type TargetType,
  type UserRow,
  targetKey,
} from './data.ts';
import { assignPersona, personas } from './personas.ts';

export interface ReplyRow {
  user_id: number;
  target_type: TargetType;
  target_id: number;
  body: string;
  created_at: Date;
}

export interface ReplyConfig {
  windowDays: number;
  maxCommentsPerUser: number;
  hotShare: number;      // fraction of reviews tagged "hot" (lots of replies)
  hotAcceptProb: number;
  normalAcceptProb: number;
  multiReplyProb: number; // probability of a user replying twice on same target
}

// Light popularity score for selecting "hot" review pool.
function popScore(r: ReviewRow): number {
  const ageDays = Math.max(1, (Date.now() - r.created_at.getTime()) / 86_400_000);
  return r.rating * 0.5 + Math.log10(1 + r.body_len) - ageDays * 0.02;
}

// Decides if a given (user, review) candidate becomes a comment.
// Exposed for testability; live config flows in from `planReplies`.
export function shouldComment(
  rng: Rng,
  isHot: boolean,
  alreadyRepliedHere: boolean,
  cfg: ReplyConfig,
): boolean {
  if (alreadyRepliedHere) return chance(rng, cfg.multiReplyProb);
  return chance(rng, isHot ? cfg.hotAcceptProb : cfg.normalAcceptProb);
}

export function planReplies(
  rng: Rng,
  users: UserRow[],
  reviews: ReviewRow[],
  existing: ExistingState,
  cfg: ReplyConfig,
): ReplyRow[] {
  if (reviews.length === 0 || users.length === 0) return [];

  // Top N% of reviews by score become "hot" -- replies cluster on these.
  const ordered = [...reviews].sort((a, b) => popScore(b) - popScore(a));
  const hotCount = Math.max(3, Math.floor(reviews.length * cfg.hotShare));
  const hot = new Set(ordered.slice(0, hotCount).map((r) => targetKey(r.target_type, r.id)));

  const userIndex = new Map<number, number>(users.map((u, i) => [u.id, i]));

  // Per-user reply budget from persona.
  const budgets = new Map<number, number>();
  for (const u of users) {
    const persona = assignPersona(userIndex.get(u.id)!);
    const lambda = personas[persona].replyLambda;
    budgets.set(u.id, clamp(poisson(rng, lambda), 0, cfg.maxCommentsPerUser));
  }

  const planned: ReplyRow[] = [];

  for (const u of users) {
    let budget = budgets.get(u.id) ?? 0;
    if (budget === 0) continue;
    const candidates = reviews.filter((r) => r.user_id !== u.id);
    if (candidates.length === 0) continue;

    const persona = assignPersona(userIndex.get(u.id)!);
    const toneWeights = personas[persona].toneWeights;

    // Repeats-per-target tracker for this user only.
    const perTarget = new Map<string, number>();

    // Random walk through a shuffled candidate list; gives spread + variety.
    const order = shuffle(rng, candidates);
    let attempts = 0;
    const maxAttempts = order.length * 3; // hard ceiling, prevents infinite loops on weird configs

    while (budget > 0 && attempts < maxAttempts) {
      const r = order[Math.floor(rng() * order.length)]!;
      const k = targetKey(r.target_type, r.id);
      const isHot = hot.has(k);
      const replied = (perTarget.get(k) ?? 0) > 0;
      attempts++;
      if (!shouldComment(rng, isHot, replied, cfg)) continue;
      // Cap to 3 per (user, target) to avoid spam-looking threads.
      if ((perTarget.get(k) ?? 0) >= 3) continue;

      const tone = pickTone(rng, toneWeights);
      const body = generateReply(rng, tone);
      const created_at = afterAnchor(rng, r.created_at, cfg.windowDays);
      planned.push({
        user_id: u.id,
        target_type: r.target_type,
        target_id: r.id,
        body,
        created_at,
      });
      perTarget.set(k, (perTarget.get(k) ?? 0) + 1);
      budget--;
    }
  }

  // Idempotency: if a prior run already inserted N seeded replies on a target,
  // skip the first N planned rows for that target so we converge instead of doubling up.
  const remaining = new Map(existing.seededReplyCount);
  const filtered: ReplyRow[] = [];
  for (const row of planned) {
    const k = targetKey(row.target_type, row.target_id);
    const left = remaining.get(k) ?? 0;
    if (left > 0) {
      remaining.set(k, left - 1);
      continue;
    }
    filtered.push(row);
  }
  return filtered;
}

export async function insertReplies(q: Querier, rows: ReplyRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const placeholders: string[] = [];
    const values: unknown[] = [];
    let p = 0;
    for (const r of slice) {
      // user_id, target_type, target_id, body, created_at, (updated_at = same param), created_by
      const a = ++p; // user_id
      const b = ++p; // target_type
      const c = ++p; // target_id
      const d = ++p; // body
      const e = ++p; // created_at  (reused for updated_at)
      const f = ++p; // created_by
      placeholders.push(`($${a},$${b},$${c},$${d},$${e},$${e},$${f},FALSE)`);
      values.push(r.user_id, r.target_type, r.target_id, r.body, r.created_at, SEED_TAG);
    }
    const res = await q.query(
      `INSERT INTO review_replies
         (user_id, target_type, target_id, body, created_at, updated_at, created_by, deleted)
       VALUES ${placeholders.join(',')}`,
      values,
    );
    inserted += res.rowCount ?? 0;
  }
  return inserted;
}
