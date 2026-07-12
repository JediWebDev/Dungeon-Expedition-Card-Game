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

Why Drizzle: lightweight TypeScript ORM that fits this Vite/React stack and pairs cleanly with Better Auth’s drizzle adapter (auth UI/login comes later).
