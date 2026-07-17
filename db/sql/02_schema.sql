-- Full schema for guilds_of_ardessia.
-- Run in PGAdmin against the `guilds_of_ardessia` database after 01_create_database.sql.
-- Prefer `npm run db:migrate` once DATABASE_URL is set; this file is the PGAdmin fallback.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Auth (Better Auth core + SIWE wallet linking)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "user" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "session" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "account" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  id_token TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "verification" (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "wallet_address" (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS wallet_address_address_chain_uidx
  ON "wallet_address" (address, chain_id);

-- ---------------------------------------------------------------------------
-- Game (guild campaign state)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "guild" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  gold INTEGER NOT NULL DEFAULT 0,
  max_roster INTEGER NOT NULL DEFAULT 6,
  recruit_quality INTEGER NOT NULL DEFAULT 1,
  shop_quality INTEGER NOT NULL DEFAULT 1,
  healer_station INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "hero" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES "guild"(id) ON DELETE CASCADE,
  placement TEXT NOT NULL,
  name TEXT NOT NULL,
  hero_class TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  experience INTEGER NOT NULL DEFAULT 0,
  exp_needed INTEGER NOT NULL DEFAULT 100,
  max_hp INTEGER NOT NULL,
  hp INTEGER NOT NULL,
  attack INTEGER NOT NULL,
  magic INTEGER NOT NULL DEFAULT 0,
  defense INTEGER NOT NULL,
  resist INTEGER NOT NULL DEFAULT 0,
  speed INTEGER NOT NULL,
  luck INTEGER NOT NULL,
  morale INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'Idle',
  portrait_seed TEXT NOT NULL,
  flavor_text TEXT NOT NULL,
  traits JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "equipment_item" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES "guild"(id) ON DELETE CASCADE,
  location TEXT NOT NULL,
  equipped_hero_id UUID REFERENCES "hero"(id) ON DELETE SET NULL,
  equip_slot TEXT,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  rarity TEXT NOT NULL,
  modifiers JSONB NOT NULL DEFAULT '{}'::jsonb,
  price INTEGER NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "guild_relic" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES "guild"(id) ON DELETE CASCADE,
  relic_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS guild_relic_guild_relic_uidx
  ON "guild_relic" (guild_id, relic_id);

CREATE TABLE IF NOT EXISTS "expedition" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES "guild"(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  dungeon_template_id TEXT,
  current_room_index INTEGER NOT NULL DEFAULT 0,
  gold_earned INTEGER NOT NULL DEFAULT 0,
  speed INTEGER NOT NULL DEFAULT 1,
  combat_round INTEGER NOT NULL DEFAULT 1,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hero_guild_id_idx ON "hero" (guild_id);
CREATE INDEX IF NOT EXISTS equipment_item_guild_id_idx ON "equipment_item" (guild_id);
CREATE INDEX IF NOT EXISTS equipment_item_equipped_hero_id_idx ON "equipment_item" (equipped_hero_id);
CREATE INDEX IF NOT EXISTS expedition_guild_id_idx ON "expedition" (guild_id);
CREATE INDEX IF NOT EXISTS session_user_id_idx ON "session" (user_id);
CREATE INDEX IF NOT EXISTS account_user_id_idx ON "account" (user_id);
CREATE INDEX IF NOT EXISTS wallet_address_user_id_idx ON "wallet_address" (user_id);
