/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Equipment, EquipSlot, EQUIP_SLOT_LABELS } from '../../types';
import { UiButton } from '../ui/UiButton';
import { UiTextHeader, uiSectionFrame } from '../ui/UiTextHeader';
import { RARITY_COLOR } from './characterCardLayout';

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
  return parts.length > 0 ? parts.join(' · ') : 'No stat bonuses';
}

interface EquipmentPickerModalProps {
  heroName: string;
  slot: EquipSlot;
  equipped: Equipment | null;
  inventoryOptions: Equipment[];
  onEquip: (itemId: string) => void;
  onUnequip: () => void;
  onClose: () => void;
}

/**
 * Dedicated inventory box for equipping / unequipping a single paperdoll slot.
 * Opens over the roster so players can compare vault gear with what's worn.
 */
export const EquipmentPickerModal: React.FC<EquipmentPickerModalProps> = ({
  heroName,
  slot,
  equipped,
  inventoryOptions,
  onEquip,
  onUnequip,
  onClose,
}) => {
  const slotLabel = EQUIP_SLOT_LABELS[slot];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`relative w-full max-w-lg max-h-[85vh] flex flex-col bg-stone-950 ${uiSectionFrame} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="equip-picker-title"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#D7BF92]/40">
          <div className="min-w-0">
            <UiTextHeader as="h3" id="equip-picker-title" className="!min-w-0">
              {slotLabel}
            </UiTextHeader>
            <p className="mt-1 text-xs text-stone-400 font-sans">
              Equip gear on <span className="text-stone-200 font-semibold">{heroName}</span> from the
              guild vault.
            </p>
          </div>
          <UiButton variant="ghost" onClick={onClose} className="!min-w-0 shrink-0">
            Close
          </UiButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5 font-sans">
          <section className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#D7BF92]">
              Currently equipped
            </h4>
            {equipped ? (
              <div className={`bg-stone-900/60 ${uiSectionFrame} p-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="inline-block w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: RARITY_COLOR[equipped.rarity] }}
                    />
                    <span className={`text-sm font-bold ${RARITY_TEXT[equipped.rarity]}`}>
                      {equipped.name}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider text-stone-500 font-bold">
                      {equipped.rarity}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400/90 mt-1 font-semibold">
                    {formatModifiers(equipped)}
                  </p>
                  {equipped.description ? (
                    <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                      {equipped.description}
                    </p>
                  ) : null}
                </div>
                <UiButton variant="danger" onClick={onUnequip} className="!min-w-0 shrink-0">
                  Unequip
                </UiButton>
              </div>
            ) : (
              <div className="bg-stone-900/40 border border-dashed border-stone-700 rounded-sm px-3.5 py-4 text-xs text-stone-500 italic">
                Nothing equipped in this slot.
              </div>
            )}
          </section>

          <section className="space-y-2">
            <h4 className="text-[10px] uppercase tracking-widest font-bold text-[#D7BF92]">
              Vault inventory ({inventoryOptions.length})
            </h4>
            {inventoryOptions.length === 0 ? (
              <div className="bg-stone-900/40 border border-dashed border-stone-700 rounded-sm px-3.5 py-6 text-center text-xs text-stone-500">
                No {slotLabel.toLowerCase()} items in the vault.
                <br />
                <span className="text-stone-600">Buy gear in the Marketplace, or unequip from another hero.</span>
              </div>
            ) : (
              <ul className="space-y-2">
                {inventoryOptions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onEquip(item.id)}
                      className={`w-full text-left bg-stone-900/70 ${uiSectionFrame} p-3.5 hover:bg-stone-900 transition cursor-pointer group`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="inline-block w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: RARITY_COLOR[item.rarity] }}
                            />
                            <span className={`text-sm font-bold ${RARITY_TEXT[item.rarity]}`}>
                              {item.name}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-stone-500 font-bold">
                              {item.rarity}
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-400/90 mt-1 font-semibold">
                            {formatModifiers(item)}
                          </p>
                          {item.description ? (
                            <p className="text-[11px] text-stone-500 mt-1 leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-[10px] uppercase tracking-widest font-bold text-[#D7BF92] group-hover:text-amber-300 pt-0.5">
                          {equipped ? 'Swap' : 'Equip'}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
