/**
 * Persistent guild / campaign state for Dungeon Expedition.
 * All game tables FK to Better Auth `user` via guild.user_id.
 */
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth';

export type EquipmentModifiers = {
  maxHp?: number;
  attack?: number;
  magic?: number;
  defense?: number;
  resist?: number;
  speed?: number;
  luck?: number;
};

/** One guild save per user (campaign hub: gold, upgrades, name). */
export const guild = pgTable('guild', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  level: integer('level').notNull().default(1),
  gold: integer('gold').notNull().default(0),
  maxRoster: integer('max_roster').notNull().default(6),
  recruitQuality: integer('recruit_quality').notNull().default(1),
  shopQuality: integer('shop_quality').notNull().default(1),
  healerStation: integer('healer_station').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Heroes on the roster or in the recruit marketplace.
 * placement: 'roster' | 'recruit_stock'
 * status: 'Idle' | 'Expedition' | 'Dead' (meaningful for roster heroes)
 */
export const hero = pgTable(
  'hero',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: uuid('guild_id')
      .notNull()
      .references(() => guild.id, { onDelete: 'cascade' }),
    placement: text('placement').notNull().$type<'roster' | 'recruit_stock'>(),
    name: text('name').notNull(),
    heroClass: text('hero_class').notNull().$type<'Warrior' | 'Rogue' | 'Mage' | 'Cleric'>(),
    level: integer('level').notNull().default(1),
    experience: integer('experience').notNull().default(0),
    expNeeded: integer('exp_needed').notNull().default(100),
    maxHp: integer('max_hp').notNull(),
    hp: integer('hp').notNull(),
    attack: integer('attack').notNull(),
    magic: integer('magic').notNull().default(0),
    defense: integer('defense').notNull(),
    resist: integer('resist').notNull().default(0),
    speed: integer('speed').notNull(),
    luck: integer('luck').notNull(),
    morale: integer('morale').notNull().default(100),
    status: text('status').notNull().$type<'Idle' | 'Expedition' | 'Dead'>().default('Idle'),
    /** When the hero last fell (for Sanctuary auto-revive). */
    diedAt: timestamp('died_at', { withTimezone: true }),
    portraitSeed: text('portrait_seed').notNull(),
    flavorText: text('flavor_text').notNull(),
    traits: jsonb('traits').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('hero_guild_id_idx').on(t.guildId)]
);

/**
 * Equipment instances owned by a guild, for sale in the shop, or equipped on a hero.
 * location: 'inventory' | 'shop_stock' | 'equipped'
 */
export const equipmentItem = pgTable(
  'equipment_item',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: uuid('guild_id')
      .notNull()
      .references(() => guild.id, { onDelete: 'cascade' }),
    location: text('location').notNull().$type<'inventory' | 'shop_stock' | 'equipped'>(),
    equippedHeroId: uuid('equipped_hero_id').references(() => hero.id, { onDelete: 'set null' }),
    equipSlot: text('equip_slot'),
    name: text('name').notNull(),
    type: text('type').notNull(),
    rarity: text('rarity').notNull().$type<'common' | 'rare' | 'epic' | 'legendary'>(),
    modifiers: jsonb('modifiers').$type<EquipmentModifiers>().notNull().default({}),
    price: integer('price').notNull(),
    description: text('description').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('equipment_item_guild_id_idx').on(t.guildId),
    index('equipment_item_equipped_hero_id_idx').on(t.equippedHeroId),
  ]
);

/** Owned relics (catalog ids from RELICS_POOL, e.g. relic_compass). */
export const guildRelic = pgTable(
  'guild_relic',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: uuid('guild_id')
      .notNull()
      .references(() => guild.id, { onDelete: 'cascade' }),
    relicId: text('relic_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('guild_relic_guild_relic_uidx').on(t.guildId, t.relicId)]
);

/**
 * Active or recently finished expedition run.
 * `state` holds the full ExpeditionState JSON for resume / post-run review.
 */
export const expedition = pgTable(
  'expedition',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    guildId: uuid('guild_id')
      .notNull()
      .references(() => guild.id, { onDelete: 'cascade' }),
    status: text('status')
      .notNull()
      .$type<'planning' | 'running' | 'room_active' | 'victory' | 'defeat' | 'retreat'>(),
    dungeonTemplateId: text('dungeon_template_id'),
    currentRoomIndex: integer('current_room_index').notNull().default(0),
    goldEarned: integer('gold_earned').notNull().default(0),
    speed: integer('speed').notNull().default(1),
    combatRound: integer('combat_round').notNull().default(1),
    state: jsonb('state').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('expedition_guild_id_idx').on(t.guildId)]
);
