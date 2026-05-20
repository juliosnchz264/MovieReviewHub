#!/usr/bin/env tsx
/**
 * Seed/enrichment script that fills the social layer (review_likes + review_replies)
 * with believable activity across all existing non-deleted ROLE_USER accounts.
 *
 * Run:   pnpm tsx generate-social-activity.ts
 * Dry:   DRY_RUN=1 pnpm tsx generate-social-activity.ts
 *
 * Idempotent. Likes use the table PK (ON CONFLICT DO NOTHING). Replies are
 * tagged with `created_by = 'seed:social-v1'`; on re-run we count existing tagged
 * replies per target and subtract from the new plan so we converge instead of
 * doubling up.
 */
import { pool } from './lib/db.ts';
import { makeRng } from './lib/random.ts';
import {
  loadExistingState,
  loadReviews,
  loadUsers,
} from './lib/data.ts';
import { insertLikes, planLikes } from './lib/likes.ts';
import { insertReplies, planReplies } from './lib/replies.ts';

const CONFIG = {
  seed: Number(process.env.SEED ?? 20260513),
  windowDays: 90,
  maxCommentsPerUser: 25,
  maxLikesPerUser: 120,
  viralReviewChance: 0.10,
  baseLikeRate: 0.20,
  viralLikeRate: 0.75,
  hotShare: 0.10,
  hotAcceptProb: 0.75,
  normalAcceptProb: 0.40,
  multiReplyProb: 0.12,
} as const;

const DRY = process.env.DRY_RUN === '1';

function fmtNum(n: number): string {
  return n.toLocaleString('en-US');
}

async function main(): Promise<void> {
  const started = Date.now();
  const rng = makeRng(CONFIG.seed);

  console.log('[seed] config', CONFIG, { dryRun: DRY });

  const [users, reviews] = await Promise.all([loadUsers(pool), loadReviews(pool)]);
  if (users.length === 0 || reviews.length === 0) {
    console.error(
      `[seed] need >=1 active user and >=1 review (have ${users.length} users, ${reviews.length} reviews). abort.`,
    );
    await pool.end();
    process.exit(2);
  }
  console.log(`[seed] loaded users=${users.length} reviews=${reviews.length}`);

  const existing = await loadExistingState(pool);
  console.log(
    `[seed] existing likes=${fmtNum(existing.totalLikes)} seeded-reply-targets=${existing.seededReplyCount.size}`,
  );

  const likePlan = planLikes(rng, users, reviews, existing, CONFIG);
  const replyRows = planReplies(rng, users, reviews, existing, CONFIG);

  const top3Reviews = [...likePlan.perReview].sort((a, b) => b - a).slice(0, 3).join('/');
  const avgLikes =
    likePlan.perReview.length === 0
      ? 0
      : (likePlan.rows.length / likePlan.perReview.length).toFixed(1);
  console.log(
    `[seed] plan: +${fmtNum(likePlan.rows.length)} likes (avg ${avgLikes}/review, top-3 ${top3Reviews || '0'}), ` +
      `viral ${likePlan.viralTargets.size}/${reviews.length}, +${fmtNum(replyRows.length)} replies`,
  );

  if (DRY) {
    console.log('[seed] DRY_RUN=1 — no writes. exiting.');
    await pool.end();
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const likesInserted = await insertLikes(client, likePlan.rows);
    const repliesInserted = await insertReplies(client, replyRows);
    await client.query('COMMIT');
    console.log(
      `[seed] committed likes=${fmtNum(likesInserted)} replies=${fmtNum(repliesInserted)} in ${(
        Date.now() - started
      ).toLocaleString()}ms`,
    );
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[seed] failed — rolled back:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (err) => {
  console.error('[seed] fatal:', err);
  await pool.end().catch(() => {});
  process.exit(1);
});
