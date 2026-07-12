## Run Locally

**Prerequisites:** Node.js, PostgreSQL (local)

1. Install dependencies:
   `npm install`
2. Create the database (PGAdmin or SQL):
   - Run `db/sql/01_create_database.sql` against the default `postgres` DB
   - Under your PGAdmin server group **Guilds of Ardessia**, use/create a server that connects to local PostgreSQL and select database `guilds_of_ardessia`
   - Run `db/sql/02_schema.sql` against `guilds_of_ardessia` (or use Drizzle below)
3. Copy `.env.example` to `.env` and set `DATABASE_URL`, `BETTER_AUTH_SECRET`
   (at least 32 chars — e.g. `openssl rand -base64 32`), and `BETTER_AUTH_URL`
4. Apply migrations (optional if you already ran `02_schema.sql`):
   `npm run db:migrate`
5. Run the app:
   `npm run dev`

### Database scripts

| Script | Purpose |
| --- | --- |
| `npm run db:generate` | Generate Drizzle migrations from `db/schema` |
| `npm run db:migrate` | Apply migrations |
| `npm run db:push` | Push schema directly (dev) |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run serve` | Run the standalone Express server (serves `dist/` + API in production) |

Why Drizzle: lightweight TypeScript ORM that fits this Vite/React stack and pairs cleanly with Better Auth’s drizzle adapter.

## Persistence architecture

Drizzle/postgres must run in Node, never in the browser, so a tiny server-side
API sits between the React client and PostgreSQL:

- **Dev:** `npm run dev` mounts an Express app at `/api/*` **inside the Vite dev
  server** (see `vite.config.ts` → `gameApiPlugin`). One command, same origin, no
  CORS.
- **Prod:** `npm run build` then `npm run serve` runs `server/index.ts`, which
  serves the built SPA and the same API.

### Layers

| File | Role |
| --- | --- |
| `server/repository.ts` | Data-access layer: maps the normalized schema ⇄ `GuildState`/`ExpeditionState`, plus `getOrCreateGuildForUser`. |
| `server/auth.ts` | Better Auth (email/password) configuration. |
| `server/api.ts` | Express app: `/api/auth/*` + session-scoped load/save. |
| `server/index.ts` | Standalone production server (SPA + API). |
| `src/lib/auth-client.ts` | Better Auth React client. |
| `src/components/AccountScreen.tsx` | Account dashboard (sign in/up, profile, password, delete). |
| `src/api/client.ts` | Browser fetch client (credentials included; fails soft). |
| `src/context/GameContext.tsx` | Loads state on startup, debounced save on change, reload on auth. |

### API

- `ALL /api/auth/*` → Better Auth (sign-up, sign-in, session, profile, …).
- `GET /api/state` → `{ guildId, guild, expedition }` for the **signed-in** user
  (`401` if guest; `guild` is `null` for a brand-new save so the client seeds).
- `PUT /api/state` → body `{ guild, expedition }` → saves that user's snapshot
  (`401` if guest; client-supplied guild ids are ignored).
- `GET /api/health` → `{ ok, database }`.

It's a **save-state / load-state pair** rather than per-entity CRUD because the
client holds the entire campaign in a single React context and mutates many
parts together.

### What is persisted and when

Persisted: guild name/level/gold/upgrades, the full roster + recruit stock,
inventory + shop stock + equipped gear, owned relics, and the active
expedition (its full `ExpeditionState` JSON, so a run can resume). Saves are
**debounced (~800 ms)** on any change to `guild`/`expedition` (covers gold
changes, purchases, recruiting, expeditions, etc.) and flushed on tab close.
State loads once on startup.

Entity ids are generated as real UUIDs (`src/utils.ts` → `generateId`) so they
map directly onto the Postgres `uuid` columns and relationships (equipped item →
hero, expedition party → roster) round-trip cleanly.

### Auth (Better Auth)

Email/password auth is wired via Better Auth (`server/auth.ts`, `/api/auth/*`).
Each signed-in user owns one guild (`getOrCreateGuildForUser`). Guests can still
play in memory; saves require a session (see the Account screen in the sidebar).

Add to `.env` (see `.env.example`):

```env
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
```

Web3 wallet linking will use the existing `wallet_address` table later.

> **Live testing needs your real DB password.** Set `DATABASE_URL` in `.env` with
> the PostgreSQL password from your PGAdmin install. Typecheck/build do not need
> a DB connection.
