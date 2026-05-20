# scripts/

TypeScript seeders that talk directly to Postgres. Lives outside `frontend/`
and `backend/` so neither runtime drags pg/tsx into prod bundles.

## Setup

```bash
cd scripts
pnpm install
cp .env.example .env
# fill DATABASE_URL — postgres://… form, NOT jdbc:postgresql://
```

`DATABASE_URL` is the standard libpq URI. For Supabase use the **transaction
pooler** on port 6543 (same one the backend uses).

## generate-social-activity.ts

Fills `review_likes` and `review_replies` with believable activity across all
non-deleted `ROLE_USER` accounts.

```bash
pnpm social          # write
pnpm social:dry      # plan only, no writes
SEED=42 pnpm social  # deterministic run
```

### What it does

- **Personas.** Every user is bucketed (`whale` / `cinephile` / `mainstream` /
  `genre-fan` / `casual` / `lurker`) deterministically by user index, so the
  same user keeps the same personality across re-runs. Long-tail
  distribution: ~5% whales, ~25% lurkers, the rest in between.
- **Likes.** Per-review popularity (rating × recency × content length) plus
  a `viralReviewChance` roll drives how big the engagement target is.
  Self-likes filtered (matches backend rule). Per-user daily-cap enforced.
  Idempotent via the table PK + `ON CONFLICT DO NOTHING`.
- **Replies.** Top `hotShare`-percent reviews are "hot" and pull most of the
  conversation; the rest get scattered comments. Bodies generated from
  tone-weighted templates (`agree`, `disagree`, `humor`, `cinephile`,
  `recommendation`, `question`, `emotional`, `technical`, `short`, `mixed`).
  Bodies are capped to 1800 chars to stay under the 2000-char DB check.
  Tagged with `created_by = 'seed:social-v1'` for idempotency.

### Re-running

Safe. Re-runs converge toward target volume rather than stacking activity:

- Likes: PK conflict drops dupes.
- Replies: existing tagged replies per target are counted and subtracted from
  the new plan.

To wipe and start clean:

```sql
DELETE FROM review_replies WHERE created_by = 'seed:social-v1';
-- likes have no tag column; truncate if you really need to reset:
-- TRUNCATE review_likes;
```

### Tuning

Edit the `CONFIG` block at the top of `generate-social-activity.ts`:

| Key                  | Effect                                                       |
|----------------------|--------------------------------------------------------------|
| `maxCommentsPerUser` | Hard cap on the per-user reply budget                        |
| `maxLikesPerUser`    | Base cap; personas multiply this internally                  |
| `viralReviewChance`  | Probability any given review becomes viral                   |
| `baseLikeRate`       | Fraction of user base that engages with a normal review      |
| `viralLikeRate`      | Same, for viral reviews                                      |
| `hotShare`           | Fraction of reviews that attract most of the comment volume  |
| `windowDays`         | Time window for synthetic timestamps                          |

### Limitations

- Schema V12 has no `reply_likes` table, so the script does not seed likes
  on comments. Add a `V13` migration + service if you need it.
- Direct DB writes skip Spring auditing / validation by design (bulk-insert
  perf). If you need both, re-implement on top of the impersonation flow
  in `seed-enrich-users.ps1`.
