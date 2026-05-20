import { config } from 'dotenv';
import pg from 'pg';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '..', '.env') });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    '[seed] DATABASE_URL is required. Copy scripts/.env.example to scripts/.env and fill it in.',
  );
  process.exit(1);
}

export const pool = new pg.Pool({
  connectionString: url,
  statement_timeout: 60_000,
  max: 4,
});

export type Querier = {
  query<R extends pg.QueryResultRow = pg.QueryResultRow>(
    text: string,
    values?: unknown[],
  ): Promise<pg.QueryResult<R>>;
};
