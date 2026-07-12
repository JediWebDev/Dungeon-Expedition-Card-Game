/**
 * Better Auth server instance (email/password).
 *
 * Created lazily so importing this module never requires DATABASE_URL —
 * Vite loads the API middleware at config time even when .env is missing.
 *
 * Web3 / SIWE wallets will plug in later via Better Auth plugins against the
 * existing `wallet_address` table.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb, isDatabaseConfigured } from '../db/index';
import * as schema from '../db/schema';

/** Origins allowed to talk to the auth API (covers Vite port fallback). */
const LOCAL_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  'http://127.0.0.1:3002',
];

function createAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      'BETTER_AUTH_SECRET must be set to a random string of at least 32 characters (see .env.example).'
    );
  }

  const baseURL =
    process.env.BETTER_AUTH_URL ??
    process.env.VITE_APP_URL ??
    'http://localhost:3000';

  return betterAuth({
    secret,
    baseURL,
    database: drizzleAdapter(getDb(), {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
    },
    user: {
      changeEmail: {
        enabled: true,
        // No email provider yet — allow immediate email updates while unverified.
        updateEmailWithoutVerification: true,
      },
      deleteUser: {
        enabled: true,
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // refresh daily
    },
    trustedOrigins: [
      ...LOCAL_ORIGINS,
      ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let authInstance: AuthInstance | null = null;

/** Lazily build (and memoize) the Better Auth instance. */
export function getAuth(): AuthInstance {
  if (authInstance) return authInstance;

  if (!isDatabaseConfigured()) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env before using auth.'
    );
  }

  authInstance = createAuth();
  return authInstance;
}
