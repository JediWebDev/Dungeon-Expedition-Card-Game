/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { useGame } from '../../context/GameContext';
import {
  Equipment,
  EquipSlot,
  EQUIP_SLOTS,
  EQUIP_SLOT_LABELS,
} from '../../types';
import { getModifiedStats } from '../../utils';
import { CharacterCard } from './CharacterCard';
import { heroToCharacterCardData } from './characterCardData';
import { EQUIP_DND_MIME, readEquipDrag, writeEquipDrag } from './equipDnD';
import { RARITY_COLOR } from './characterCardLayout';
import { UiButton } from '../ui/UiButton';
import { UiTextHeader, uiSectionFrame } from '../ui/UiTextHeader';

const RARITY_TEXT: Record<Equipment['rarity'], string> = {
  legendary: 'text-amber-300',
  epic: 'text-violet-300',
  rare: 'text-cyan-300',
  common: 'text-stone-300',
};

function formatModifiers(item: Equipment): string {
  const parts = Object.entries(item.modifiers)
    .filter(([, v]) => typeof v === 'number' && v !== 0)
    .map(([stat, val]) => `${val! > 0 ? '+' : ''}${val} ${stat}`);
  return parts.length > 0 ? parts.join(' · ') : 'No bonuses';
}

type InventoryFilter = 'all' | EquipSlot;

/**
 * Full-screen character sheet: paperdoll on the left, vault inventory on the right.
 * Drag items between slots and the vault, or click vault item → matching slot.
 */
export const CharacterEquipmentScreen: React.FC = () => {
  const {
    guild,
    selectedHeroId,
    setSelectedHeroId,
    setActiveScreen,
    equipItem,
    unequipItem,
    actionPending,
  } = useGame();

  const hero = guild.roster.find((h) => h.id === selectedHeroId) ?? null;
  const [filter, setFilter] = useState<InventoryFilter>('all');
  const [selectedSlot, setSelectedSlot] = useState<EquipSlot | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [dropHint, setDropHint] = useState<string | null>(null);

  const canManage = Boolean(hero && hero.status !== 'Expedition');

  const cardData = useMemo(
    () => (hero ? heroToCharacterCardData(hero, guild.relics) : null),
    [hero, guild.relics]
  );

  const stats = hero ? getModifiedStats(hero, guild.relics) : null;

  const inventory = useMemo(() => {
    const items = [...guild.inventory];
    items.sort((a, b) => {
      const rarityRank = { legendary: 0, epic: 1, rare: 2, common: 3 };
      const rd = rarityRank[a.rarity] - rarityRank[b.rarity];
      if (rd !== 0) return rd;
      return a.name.localeCompare(b.name);
    });
    if (filter === 'all') return items;
    return items.filter((i) => i.type === filter);
  }, [guild.inventory, filter]);

  const pendingItem = pendingItemId
    ? guild.inventory.find((i) => i.id === pendingItemId) ?? null
    : null;

  const detailItem = useMemo(() => {
    if (hoveredItemId) {
      const fromVault = guild.inventory.find((i) => i.id === hoveredItemId);
      if (fromVault) return fromVault;
      if (hero) {
        for (const slot of EQUIP_SLOTS) {
          const eq = hero.equipment[slot];
          if (eq?.id === hoveredItemId) return eq;
        }
      }
    }
    return pendingItem;
  }, [hoveredItemId, guild.inventory, hero, pendingItem]);

  const goBack = () => {
    setActiveScreen('guild');
    setSelectedHeroId(hero?.id ?? null);
  };

  if (!hero || !cardData) {
    return (
      <div
        className={`flex flex-1 flex-col items-center justify-center gap-4 p-8 ${uiSectionFrame} bg-stone-950/70`}
      >
        <p className="text-sm text-stone-400 font-sans">No adventurer selected.</p>
        <UiButton onClick={() => setActiveScreen('guild')}>Back to Roster</UiButton>
      </div>
    );
  }

  const handleEquipFromInventory = (item: Equipment, slot: EquipSlot) => {
    if (!canManage || actionPending) return;
    if (item.type !== slot) {
      setDropHint(`That item only fits the ${EQUIP_SLOT_LABELS[item.type]} slot.`);
      return;
    }
    equipItem(hero.id, item.id, slot);
    setPendingItemId(null);
    setSelectedSlot(null);
    setDropHint(null);
  };

  const handleUnequip = (slot: EquipSlot) => {
    if (!canManage || actionPending) return;
    unequipItem(hero.id, slot);
    setDropHint(null);
  };

  const handleSlotClick = (slot: EquipSlot) => {
    if (!canManage) return;
    if (pendingItem) {
      handleEquipFromInventory(pendingItem, slot);
      return;
    }
    setSelectedSlot((prev) => (prev === slot ? null : slot));
  };

  const handleInventoryClick = (item: Equipment) => {
    if (!canManage) return;
    if (selectedSlot) {
      handleEquipFromInventory(item, selectedSlot);
      return;
    }
    setPendingItemId((prev) => (prev === item.id ? null : item.id));
    setSelectedSlot(item.type);
  };

  const onSlotDrop = (slot: EquipSlot, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const payload = readEquipDrag(e);
    if (!payload || !canManage) return;

    if (payload.source === 'inventory') {
      const item = guild.inventory.find((i) => i.id === payload.itemId);
      if (item) handleEquipFromInventory(item, slot);
      return;
    }

    if (payload.source === 'slot' && payload.slot !== slot) {
      if (payload.itemType !== slot) {
        setDropHint(`That item belongs in ${EQUIP_SLOT_LABELS[payload.itemType]}.`);
        return;
      }
      // Unequip source first so the item returns to inventory, then equip onto target.
      unequipItem(hero.id, payload.slot);
      equipItem(hero.id, payload.itemId, slot);
      setDropHint(null);
    }
  };

  const onInventoryDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const payload = readEquipDrag(e);
    if (!payload || payload.source !== 'slot' || !canManage) return;
    handleUnequip(payload.slot);
  };

  return (
    <div className="flex flex-1 flex-col min-h-0 gap-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <UiTextHeader>Character</UiTextHeader>
          <p className="mt-1 text-xs text-stone-400 font-sans">
            Drag gear between the vault and {hero.name}&apos;s equipment slots
            {canManage ? '' : ' (locked while on expedition)'}.
          </p>
        </div>
        <UiButton variant="ghost" onClick={goBack}>
          Back to Roster
        </UiButton>
      </div>

      {dropHint && (
        <p className="text-xs font-sans text-amber-400 bg-amber-950/40 border border-amber-900/50 px-3 py-2 rounded-sm">
          {dropHint}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 flex-1 min-h-0">
        <section
          className={`xl:col-span-5 flex flex-col gap-3 bg-stone-950/80 ${uiSectionFrame} p-4 min-h-0 overflow-y-auto`}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#D7BF92] font-sans">
              Equipment
            </h3>
            {selectedSlot && (
              <span className="text-[10px] font-sans text-stone-400">
                Selected:{' '}
                <span className="text-[#D7BF92]">{EQUIP_SLOT_LABELS[selectedSlot]}</span>
                {hero.equipment[selectedSlot] ? (
                  <button
                    type="button"
                    className="ml-2 text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    onClick={() => handleUnequip(selectedSlot)}
                  >
                    Unequip
                  </button>
                ) : null}
              </span>
            )}
          </div>

          <div className="mx-auto w-full max-w-[464px]">
            <CharacterCard
              data={cardData}
              selectedSlot={selectedSlot}
              interactiveSlots={canManage ? EQUIP_SLOTS : []}
              onSlotClick={canManage ? handleSlotClick : undefined}
              onSlotDragStart={
                canManage
                  ? (slot, e) => {
                      const item = hero.equipment[slot];
                      if (!item) return;
                      writeEquipDrag(e, {
                        source: 'slot',
                        slot,
                        itemId: item.id,
                        itemType: item.type,
                      });
                    }
                  : undefined
              }
              onSlotDragOver={
                canManage
                  ? (_slot, e) => {
                      if (e.dataTransfer.types.includes(EQUIP_DND_MIME)) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }
                    }
                  : undefined
              }
              onSlotDrop={canManage ? onSlotDrop : undefined}
            />
          </div>

          {stats && (
            <div
              className={`mt-auto grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-sans ${uiSectionFrame} p-3 bg-stone-900/50`}
            >
              {(
                [
                  ['HP', `${hero.hp}/${stats.maxHp}`],
                  ['Attack', stats.attack],
                  ['Magic', stats.magic],
                  ['Defense', stats.defense],
                  ['Resist', stats.resist],
                  ['Speed', stats.speed],
                  ['Luck', stats.luck],
                  ['Morale', hero.morale],
                ] as const
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-2 border-b border-stone-800/60 pb-1"
                >
                  <span className="text-stone-500 uppercase tracking-wider">{label}</span>
                  <span className="text-stone-200 font-semibold">{value}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          className={`xl:col-span-7 flex flex-col gap-3 bg-stone-950/80 ${uiSectionFrame} p-4 min-h-0`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes(EQUIP_DND_MIME)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            }
          }}
          onDrop={onInventoryDrop}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#D7BF92] font-sans">
              Inventory · Guild Vault ({guild.inventory.length})
            </h3>
            <p className="text-[10px] text-stone-500 font-sans">
              Drop equipped gear here to unequip
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
            {EQUIP_SLOTS.map((slot) => (
              <FilterChip
                key={slot}
                active={filter === slot}
                onClick={() => setFilter(slot)}
                label={EQUIP_SLOT_LABELS[slot]}
              />
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {inventory.length === 0 ? (
              <div className="h-full min-h-[200px] flex items-center justify-center border border-dashed border-stone-700 rounded-sm text-xs text-stone-500 font-sans text-center px-4">
                Vault is empty for this filter.
                <br />
                Buy gear in Marketplace & Vault, or drop equipped items here.
              </div>
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 content-start">
                {inventory.map((item) => {
                  const selected = pendingItemId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        draggable={canManage}
                        onDragStart={(e) => {
                          writeEquipDrag(e, {
                            source: 'inventory',
                            itemId: item.id,
                            itemType: item.type,
                          });
                        }}
                        onClick={() => handleInventoryClick(item)}
                        onMouseEnter={() => setHoveredItemId(item.id)}
                        onMouseLeave={() =>
                          setHoveredItemId((id) => (id === item.id ? null : id))
                        }
                        className={`w-full text-left p-2.5 rounded-sm border transition cursor-grab active:cursor-grabbing font-sans ${
                          selected
                            ? 'border-amber-500 bg-amber-950/30'
                            : 'border-stone-700 bg-stone-900/70 hover:border-[#D7BF92]'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: RARITY_COLOR[item.rarity] }}
                          />
                          <span
                            className={`text-[11px] font-bold truncate ${RARITY_TEXT[item.rarity]}`}
                          >
                            {item.name}
                          </span>
                        </div>
                        <p className="text-[9px] uppercase tracking-wider text-stone-500 font-bold">
                          {EQUIP_SLOT_LABELS[item.type]} · {item.rarity}
                        </p>
                        <p className="text-[10px] text-emerald-400/90 mt-1 font-semibold line-clamp-2">
                          {formatModifiers(item)}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {detailItem && (
            <div className={`shrink-0 ${uiSectionFrame} bg-stone-900/80 p-3 font-sans`}>
              <p className={`text-sm font-bold ${RARITY_TEXT[detailItem.rarity]}`}>
                {detailItem.name}
              </p>
              <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-0.5">
                {EQUIP_SLOT_LABELS[detailItem.type]} · {detailItem.rarity}
              </p>
              <p className="text-[11px] text-emerald-400 mt-1">{formatModifiers(detailItem)}</p>
              {detailItem.description ? (
                <p className="text-[11px] text-stone-400 mt-1 leading-relaxed">
                  {detailItem.description}
                </p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-sm border transition cursor-pointer font-sans ${
        active
          ? 'border-[#D7BF92] text-[#D7BF92] bg-[#D7BF92]/10'
          : 'border-stone-700 text-stone-500 hover:border-stone-500'
      }`}
    >
      {label}
    </button>
  );
}
