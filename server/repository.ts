/**
 * Data-access layer for Dungeon Expedition ("Guilds of Ardessia").
 *
 * Maps between the normalized Drizzle schema (guild / hero / equipment_item /
 * guild_relic / expedition) and the in-memory game shapes the React client uses
 * (`GuildState`, `ExpeditionState`).
 *
 * Persistence strategy: the whole guild is saved as a single snapshot. On save we
 * replace all child rows (heroes, equipment, relics, expedition) inside one
 * transaction. Client-generated ids are real UUIDs (see src/utils.ts
 * `generateId`), so relationships (equipped items -> hero, expedition party -> roster)
 * round-trip faithfully.
 *
 * Auth: each Better Auth `user.id` owns exactly one guild (`guild.user_id` unique).
 * Call `getOrCreateGuildForUser(session.user.id)` from authenticated API routes.
 */
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '../db/index';
import { equipmentItem, expedition, guild, guildRelic, hero } from '../db/schema/game';
import { RELICS_POOL } from '../src/data';
import type {
  Equipment,
  ExpeditionState,
  GuildState,
  Hero,
  Relic,
} from '../src/types';

const DEFAULT_GUILD_NAME = 'New Guild';

type EquipSlot = 'weapon' | 'armor' | 'accessory';

/**
 * Ensure the authenticated user has a guild row and return its id.
 * The `user` row must already exist (created by Better Auth on sign-up).
 */
export async function getOrCreateGuildForUser(userId: string): Promise<string> {
  const db = getDb();

  const existing = await db
    .select({ id: guild.id })
    .from(guild)
    .where(eq(guild.userId, userId))
    .limit(1);

  if (existing.length > 0) return existing[0].id;

  const inserted = await db
    .insert(guild)
    .values({ userId, name: DEFAULT_GUILD_NAME })
    .returning({ id: guild.id });

  return inserted[0].id;
}

function toEquipment(row: typeof equipmentItem.$inferSelect): Equipment {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    rarity: row.rarity,
    modifiers: row.modifiers ?? {},
    price: row.price,
    description: row.description,
  };
}

function toHero(row: typeof hero.$inferSelect, equipped: Partial<Record<EquipSlot, Equipment>>): Hero {
  return {
    id: row.id,
    name: row.name,
    heroClass: row.heroClass,
    level: row.level,
    experience: row.experience,
    expNeeded: row.expNeeded,
    maxHp: row.maxHp,
    hp: row.hp,
    attack: row.attack,
    defense: row.defense,
    speed: row.speed,
    luck: row.luck,
    morale: row.morale,
    status: row.status,
    equipment: {
      weapon: equipped.weapon ?? null,
      armor: equipped.armor ?? null,
      accessory: equipped.accessory ?? null,
    },
    portraitSeed: row.portraitSeed,
    flavorText: row.flavorText,
    traits: row.traits ?? [],
  };
}

/**
 * Load the full game state for a guild.
 * Returns `guild: null` when the guild has never been seeded (no heroes and no
 * equipment yet) so the client can push its freshly-generated starter state.
 */
export async function loadGameState(guildId: string): Promise<{
  guild: GuildState | null;
  expedition: ExpeditionState | null;
}> {
  const db = getDb();

  const [guildRow] = await db.select().from(guild).where(eq(guild.id, guildId)).limit(1);
  if (!guildRow) return { guild: null, expedition: null };

  const [heroRows, itemRows, relicRows, expeditionRows] = await Promise.all([
    db.select().from(hero).where(eq(hero.guildId, guildId)),
    db.select().from(equipmentItem).where(eq(equipmentItem.guildId, guildId)),
    db.select().from(guildRelic).where(eq(guildRelic.guildId, guildId)),
    db
      .select()
      .from(expedition)
      .where(eq(expedition.guildId, guildId))
      .orderBy(desc(expedition.updatedAt))
      .limit(1),
  ]);

  // Unseeded guild: let the client provide its generated starter state.
  if (heroRows.length === 0 && itemRows.length === 0) {
    return { guild: null, expedition: null };
  }

  // Group equipped items by hero id + slot.
  const equippedByHero = new Map<string, Partial<Record<EquipSlot, Equipment>>>();
  for (const item of itemRows) {
    if (item.location === 'equipped' && item.equippedHeroId && item.equipSlot) {
      const slots = equippedByHero.get(item.equippedHeroId) ?? {};
      slots[item.equipSlot as EquipSlot] = toEquipment(item);
      equippedByHero.set(item.equippedHeroId, slots);
    }
  }

  const roster: Hero[] = [];
  const recruitStock: Hero[] = [];
  for (const h of heroRows) {
    const heroObj = toHero(h, equippedByHero.get(h.id) ?? {});
    if (h.placement === 'recruit_stock') recruitStock.push(heroObj);
    else roster.push(heroObj);
  }

  const inventory = itemRows.filter((i) => i.location === 'inventory').map(toEquipment);
  const shopStock = itemRows.filter((i) => i.location === 'shop_stock').map(toEquipment);

  const relics: Relic[] = relicRows
    .map((r) => RELICS_POOL.find((catalog) => catalog.id === r.relicId))
    .filter((r): r is Relic => Boolean(r));

  const guildState: GuildState = {
    name: guildRow.name,
    level: guildRow.level,
    gold: guildRow.gold,
    roster,
    inventory,
    relics,
    recruitStock,
    shopStock,
    upgrades: {
      maxRoster: guildRow.maxRoster,
      recruitQuality: guildRow.recruitQuality,
      shopQuality: guildRow.shopQuality,
      healerStation: guildRow.healerStation,
    },
  };

  const expeditionState = expeditionRows.length > 0
    ? (expeditionRows[0].state as ExpeditionState)
    : null;

  return { guild: guildState, expedition: expeditionState };
}

/** Persist the full game snapshot for a guild (replace-all inside one transaction). */
export async function saveGameState(
  guildId: string,
  payload: { guild: GuildState; expedition: ExpeditionState | null }
): Promise<void> {
  const db = getDb();
  const { guild: g, expedition: exp } = payload;

  await db.transaction(async (tx) => {
    await tx
      .update(guild)
      .set({
        name: g.name,
        level: g.level,
        gold: g.gold,
        maxRoster: g.upgrades.maxRoster,
        recruitQuality: g.upgrades.recruitQuality,
        shopQuality: g.upgrades.shopQuality,
        healerStation: g.upgrades.healerStation,
        updatedAt: new Date(),
      })
      .where(eq(guild.id, guildId));

    // Replace child rows. Equipment first (FK to hero), then heroes, relics, expedition.
    await tx.delete(equipmentItem).where(eq(equipmentItem.guildId, guildId));
    await tx.delete(hero).where(eq(hero.guildId, guildId));
    await tx.delete(guildRelic).where(eq(guildRelic.guildId, guildId));
    await tx.delete(expedition).where(eq(expedition.guildId, guildId));

    const heroValues: (typeof hero.$inferInsert)[] = [];
    const pushHero = (h: Hero, placement: 'roster' | 'recruit_stock') => {
      heroValues.push({
        id: h.id,
        guildId,
        placement,
        name: h.name,
        heroClass: h.heroClass,
        level: h.level,
        experience: h.experience,
        expNeeded: h.expNeeded,
        maxHp: h.maxHp,
        hp: h.hp,
        attack: h.attack,
        defense: h.defense,
        speed: h.speed,
        luck: h.luck,
        morale: h.morale,
        status: h.status,
        portraitSeed: h.portraitSeed,
        flavorText: h.flavorText,
        traits: h.traits,
      });
    };
    g.roster.forEach((h) => pushHero(h, 'roster'));
    g.recruitStock.forEach((h) => pushHero(h, 'recruit_stock'));
    if (heroValues.length > 0) await tx.insert(hero).values(heroValues);

    const itemValues: (typeof equipmentItem.$inferInsert)[] = [];
    const pushItem = (
      e: Equipment,
      location: 'inventory' | 'shop_stock' | 'equipped',
      equippedHeroId?: string,
      equipSlot?: EquipSlot
    ) => {
      itemValues.push({
        id: e.id,
        guildId,
        location,
        equippedHeroId: equippedHeroId ?? null,
        equipSlot: equipSlot ?? null,
        name: e.name,
        type: e.type,
        rarity: e.rarity,
        modifiers: e.modifiers,
        price: e.price,
        description: e.description,
      });
    };
    g.inventory.forEach((e) => pushItem(e, 'inventory'));
    g.shopStock.forEach((e) => pushItem(e, 'shop_stock'));
    g.roster.forEach((h) => {
      (['weapon', 'armor', 'accessory'] as EquipSlot[]).forEach((slot) => {
        const item = h.equipment[slot];
        if (item) pushItem(item, 'equipped', h.id, slot);
      });
    });
    if (itemValues.length > 0) await tx.insert(equipmentItem).values(itemValues);

    // Dedupe relics by catalog id (guild_relic has a unique (guild_id, relic_id) index).
    const relicIds = Array.from(new Set(g.relics.map((r) => r.id)));
    if (relicIds.length > 0) {
      await tx.insert(guildRelic).values(relicIds.map((relicId) => ({ guildId, relicId })));
    }

    if (exp) {
      await tx.insert(expedition).values({
        guildId,
        status: exp.status,
        dungeonTemplateId: exp.dungeon?.id ?? null,
        currentRoomIndex: exp.currentRoomIndex,
        goldEarned: exp.goldEarned,
        speed: exp.speed,
        combatRound: exp.combatRound,
        state: exp,
      });
    }
  });
}
