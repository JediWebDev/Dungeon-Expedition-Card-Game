/**
 * PostgreSQL connection via Drizzle + postgres.js.
 * Set DATABASE_URL in `.env` (see `.env.example`).
 *
 * The connection is created lazily on first use so that importing this module
 * (e.g. from the Vite dev server middleware) never throws when DATABASE_URL is
 * absent. API handlers surface a clear error instead of crashing startup.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof drizzle<typeof schema>>;

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: Database | null = null;

/** Lazily create (and memoize) the Drizzle client. Throws if DATABASE_URL is unset. */
export function getDb(): Database {
  if (dbInstance) return dbInstance;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and point it at your local PostgreSQL database.'
    );
  }

  client = postgres(connectionString, { max: 10 });
  dbInstance = drizzle(client, { schema });
  return dbInstance;
}

/** True when DATABASE_URL is configured (does not attempt to connect). */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
