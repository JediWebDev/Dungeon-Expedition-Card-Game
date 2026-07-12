## Run Locally

**Prerequisites:** Node.js, PostgreSQL (local)

1. Install dependencies:
   `npm install`
2. Create the database (PGAdmin or SQL):
   - Run `db/sql/01_create_database.sql` against the default `postgres` DB
   - Under your PGAdmin server group **Guilds of Ardessia**, use/create a server that connects to local PostgreSQL and select database `guilds_of_ardessia`
   - Run `db/sql/02_schema.sql` against `guilds_of_ardessia` (or use Drizzle below)
3. Copy `.env.example` to `.env` and set `DATABASE_URL` with your postgres password
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

Why Drizzle: lightweight TypeScript ORM that fits this Vite/React stack and pairs cleanly with Better Auth’s drizzle adapter (auth UI/login comes later).

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
| `server/repository.ts` | Data-access layer: maps the normalized schema ⇄ `GuildState`/`ExpeditionState`, plus `getOrCreateDefaultGuild`. |
| `server/api.ts` | Express app exposing the load/save endpoints. |
| `server/index.ts` | Standalone production server (SPA + API). |
| `src/api/client.ts` | Browser fetch client (fails soft if the API/DB is down). |
| `src/context/GameContext.tsx` | Loads state on startup, debounced save on change. |

### API

- `GET /api/state` → `{ guildId, guild, expedition }` (`guild` is `null` for a
  brand-new save, so the client seeds its generated starter guild).
- `PUT /api/state` → body `{ guildId?, guild, expedition }` → saves a full
  snapshot.
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

### Default guild until Better Auth exists

Login isn't wired yet, so the server operates on a single **default local user +
guild** (`DEFAULT_USER_ID = 'local-dev-user'` in `server/repository.ts`).
`getOrCreateDefaultGuild()` lazily creates one `user` row and one `guild` row and
returns its id. To switch to real authentication later: resolve the guild from
the authenticated session's user id (replace the `DEFAULT_USER_ID` lookup) — the
rest of the data-access layer is already user-agnostic.

> **Live testing needs your real DB password.** Set `DATABASE_URL` in `.env` with
> the PostgreSQL password from your PGAdmin install. Typecheck/build do not need
> a DB connection, but the API returns `500 password authentication failed` until
> the password is correct.
