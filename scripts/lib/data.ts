import type { Querier } from './db.ts';

export const SEED_TAG = 'seed:social-v1';

export type TargetType = 'MOVIE' | 'SERIES';

export interface UserRow {
  id: number;
  username: string;
}

export interface ReviewRow {
  id: number;
  user_id: number;
  rating: number;
  body_len: number;
  created_at: Date;
  target_type: TargetType;
}

export interface ExistingState {
  // key = `${type}:${id}` -> set of user_ids that already liked it
  likesByTarget: Map<string, Set<number>>;
  // key = `${type}:${id}` -> how many seeded replies are already there
  seededReplyCount: Map<string, number>;
  // total likes in the DB (just for logging)
  totalLikes: number;
}

export const targetKey = (t: TargetType, id: number): string => `${t}:${id}`;

export async function loadUsers(q: Querier): Promise<UserRow[]> {
  const { rows } = await q.query<{ id: string | number; username: string }>(
    `SELECT id, username
       FROM users
      WHERE role = 'ROLE_USER' AND deleted = FALSE
      ORDER BY id`,
  );
  return rows.map((r) => ({ id: Number(r.id), username: r.username }));
}

export async function loadReviews(q: Querier): Promise<ReviewRow[]> {
  const movie = await q.query<{
    id: string | number;
    user_id: string | number;
    rating: number;
    body_len: string | number;
    created_at: Date;
  }>(`SELECT id, user_id, rating,
             COALESCE(char_length(comment), 0) AS body_len,
             created_at
        FROM reviews
       WHERE deleted = FALSE`);

  const series = await q.query<{
    id: string | number;
    user_id: string | number;
    rating: number;
    body_len: string | number;
    created_at: Date;
  }>(`SELECT id, user_id, rating,
             COALESCE(char_length(comment), 0) AS body_len,
             created_at
        FROM series_reviews
       WHERE deleted = FALSE`);

  const mapRow = (target_type: TargetType) =>
    (r: typeof movie.rows[number]): ReviewRow => ({
      id: Number(r.id),
      user_id: Number(r.user_id),
      rating: Number(r.rating),
      body_len: Number(r.body_len),
      created_at: r.created_at,
      target_type,
    });

  return [...movie.rows.map(mapRow('MOVIE')), ...series.rows.map(mapRow('SERIES'))];
}

export async function loadExistingState(q: Querier): Promise<ExistingState> {
  const likes = await q.query<{ user_id: string | number; target_type: TargetType; target_id: string | number }>(
    `SELECT user_id, target_type, target_id FROM review_likes`,
  );
  const likesByTarget = new Map<string, Set<number>>();
  for (const r of likes.rows) {
    const k = targetKey(r.target_type, Number(r.target_id));
    let s = likesByTarget.get(k);
    if (!s) {
      s = new Set();
      likesByTarget.set(k, s);
    }
    s.add(Number(r.user_id));
  }

  const replies = await q.query<{ target_type: TargetType; target_id: string | number; n: string | number }>(
    `SELECT target_type, target_id, COUNT(*)::int AS n
       FROM review_replies
      WHERE created_by = $1 AND deleted = FALSE
      GROUP BY target_type, target_id`,
    [SEED_TAG],
  );
  const seededReplyCount = new Map<string, number>();
  for (const r of replies.rows) {
    seededReplyCount.set(targetKey(r.target_type, Number(r.target_id)), Number(r.n));
  }

  return { likesByTarget, seededReplyCount, totalLikes: likes.rows.length };
}
