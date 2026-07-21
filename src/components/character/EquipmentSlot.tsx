/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import type { EquipmentSlotData } from './characterCardData';
import { SLOT_SIZE, cw, ch, RARITY_COLOR } from './characterCardLayout';
import { EQUIP_DND_MIME } from './equipDnD';

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
  /** Allow dragging the equipped item out of this slot. */
  draggableItem?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
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
  draggableItem = false,
  onDragStart,
  onDragOver,
  onDrop,
  onDragLeave,
}) => {
  const rarityColor = item ? RARITY_COLOR[item.rarity] ?? RARITY_COLOR.common : null;
  const interactive = Boolean(onClick) || Boolean(onDrop);

  return (
    <button
      type="button"
      disabled={!interactive}
      onClick={onClick}
      draggable={Boolean(draggableItem && item && onDragStart)}
      onDragStart={onDragStart}
      onDragOver={(e) => {
        if (onDragOver) {
          onDragOver(e);
          return;
        }
        if (onDrop && e.dataTransfer.types.includes(EQUIP_DND_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }
      }}
      onDrop={onDrop}
      onDragLeave={onDragLeave}
      title={item ? `${label}: ${item.name}` : `${label} (empty) — drop gear here`}
      className={`absolute p-0 m-0 bg-no-repeat transition-[box-shadow,transform] duration-150 ${
        interactive ? 'cursor-pointer hover:brightness-125 focus:outline-none' : 'cursor-default'
      } ${draggableItem && item ? 'active:cursor-grabbing' : ''}`}
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
