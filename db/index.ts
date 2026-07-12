/**
 * PostgreSQL connection via Drizzle + postgres.js.
 * Set DATABASE_URL in `.env` (see `.env.example`).
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    'DATABASE_URL is not set. Copy .env.example to .env and point it at your local PostgreSQL database.'
  );
}

/** Connection pool used by Drizzle. Prefer importing `db` from this module. */
const client = postgres(connectionString, { max: 10 });

export const db = drizzle(client, { schema });
export type Database = typeof db;
export { schema };
