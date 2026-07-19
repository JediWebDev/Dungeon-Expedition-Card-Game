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
| `npm run portraits:upload -- ./assets/portraits` | Upload portrait files to R2 |

Why Drizzle: lightweight TypeScript ORM that fits this Vite/React stack and pairs cleanly with Better Auth’s drizzle adapter.

## Cloudflare R2 (portraits)

Hero portraits are served from a **public** R2 bucket. Until
`VITE_R2_PUBLIC_URL` is set (or an object is missing), the UI keeps the
procedural SVG portraits.

### Create / connect the bucket (Cloudflare dashboard)

1. Open [Cloudflare Dashboard → R2](https://dash.cloudflare.com/?to=/:account/r2).
2. Use bucket **`guilds-of-ardessia`** (match `R2_BUCKET_NAME`).
3. Open the bucket → **Settings**:
   - Under **Public access**, enable an **r2.dev** subdomain (fine for local/dev),
     **or** connect a **Custom Domain** for production.
   - Copy the public base URL (no trailing slash) into `R2_PUBLIC_URL` and
     `VITE_R2_PUBLIC_URL`.
4. **Manage R2 API Tokens** → create a token with **Object Read & Write** scoped
   to this bucket (needed for uploads / health checks). Copy:
   - Access Key ID → `R2_ACCESS_KEY_ID`
   - Secret Access Key → `R2_SECRET_ACCESS_KEY`
5. Your Account ID (R2 overview / URL) → `R2_ACCOUNT_ID`.

### Object key layout

```
hero-portraits/Sigurd_Warrior.png
hero-portraits/Lyra_Rogue.png
hero-portraits/Kaeleen_Mage.png
hero-portraits/Sariel_Cleric.png
equipment/…                                 # next
```

Register new hero stems in `src/lib/portraitCatalog.ts` → `HERO_PORTRAITS_BY_CLASS`.
The browser loads `${VITE_R2_PUBLIC_URL}/hero-portraits/{Stem}.png`.

### Code

| File | Role |
| --- | --- |
| `server/r2.ts` | S3-compatible R2 client (uploads, health check). |
| `src/lib/portraitCatalog.ts` | Known portrait stems by class. |
| `src/lib/portraits.ts` | Public URL / object-key helpers for the browser. |
| `src/components/Portrait.tsx` | Tries R2 images, falls back to SVG. |

## Persistence architecture

**Game rules run on the server.** The React client sends intents
(`POST /api/game/action`) such as `buyEquipment` or `executeCombatRound`. The
server loads the player's snapshot, applies `server/game/engine.ts`, saves, and
returns the new state. Clients cannot invent gold, loot, or combat outcomes via
`PUT` anymore (that route was removed).

Drizzle/postgres must run in Node, never in the browser:

- **Dev:** `npm run dev` mounts Express at `/api/*` inside Vite.
- **Prod:** `npm run build` then `npm run serve`.

### Layers

| File | Role |
| --- | --- |
| `server/game/engine.ts` | Authoritative game reducer (`applyGameAction`). |
| `src/gameActions.ts` | Shared action intent types (client + server). |
| `server/repository.ts` | Data-access layer: schema ⇄ `GuildState`/`ExpeditionState`. |
| `server/auth.ts` | Better Auth (email/password) configuration. |
| `server/api.ts` | Express: auth + `/api/state` + `/api/game/action`. |
| `server/index.ts` | Standalone production server (SPA + API). |
| `src/lib/auth-client.ts` | Better Auth React client. |
| `src/components/AccountScreen.tsx` | Account dashboard. |
| `src/api/client.ts` | `fetchGameState` + `dispatchGameAction`. |
| `src/context/GameContext.tsx` | Thin UI state: dispatches intents, mirrors server snapshot. |

### API

- `ALL /api/auth/*` → Better Auth.
- `GET /api/state` → load (or seed) the signed-in user's guild + expedition.
- `POST /api/game/action` → body: a `GameAction` intent → apply rules, save, return snapshot (`401` if guest).
- `GET /api/health` → `{ ok, database, r2 }`.

You must be signed in to play with persistence — guests see an empty guild until Account → sign in.

### What is persisted and when

Persisted: guild name/level/gold/upgrades, roster + recruit stock, inventory +
shop stock + equipped gear, relics, and the active expedition JSON. The server
writes after every successful `POST /api/game/action` (and when seeding a new
account on first `GET /api/state`).

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
