/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { EquipmentSlotData } from './characterCardData';
import { SLOT_SIZE, cw, ch, RARITY_COLOR } from './characterCardLayout';

interface EquipmentSlotProps {
  label: string;
  /** Top-left of the slot in design pixels. */
  x: number;
  y: number;
  /** Source frame PNG — the slot re-draws its own region from it. */
  spriteUrl: string;
  item?: EquipmentSlotData | null;
  selected?: boolean;
  onClick?: () => void;
}

/**
 * A single equipment slot. It paints its exact region of the container art via
 * a full-card background sprite (`100cqw 100cqh` + negative offset), so it lands
 * pixel-perfectly over the baked slot box while rendering *above* the portrait.
 * When an item is equipped it gains a rarity-colored border and corner gem.
 */
export const EquipmentSlot: React.FC<EquipmentSlotProps> = ({
  label,
  x,
  y,
  spriteUrl,
  item = null,
  selected = false,
  onClick,
}) => {
  const rarityColor = item ? RARITY_COLOR[item.rarity] ?? RARITY_COLOR.common : null;
  const interactive = Boolean(onClick);

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      title={item ? `${label}: ${item.name}` : `${label} (empty)`}
      className={`absolute p-0 m-0 bg-no-repeat transition-[box-shadow,transform] duration-150 ${
        interactive ? 'cursor-pointer hover:brightness-125 focus:outline-none' : 'cursor-default'
      }`}
      style={{
        left: cw(x),
        top: ch(y),
        width: cw(SLOT_SIZE),
        height: ch(SLOT_SIZE),
        backgroundImage: `url(${spriteUrl})`,
        backgroundSize: '100cqw 100cqh',
        backgroundPosition: `-${cw(x)} -${ch(y)}`,
        boxShadow: rarityColor
          ? `inset 0 0 0 ${cw(2)} ${rarityColor}, 0 0 ${cw(6)} ${rarityColor}66`
          : selected
            ? `inset 0 0 0 ${cw(2)} ${RARITY_COLOR.common}`
            : undefined,
        outline: selected ? `${cw(2)} solid ${RARITY_COLOR.rare}` : undefined,
      }}
    >
      {rarityColor && (
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{
            right: cw(3),
            top: ch(3),
            width: cw(7),
            height: cw(7),
            backgroundColor: rarityColor,
            boxShadow: `0 0 ${cw(4)} ${rarityColor}`,
          }}
        />
      )}
    </button>
  );
};
