/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pixel-perfect layout constants for the character card, measured directly from
 * `character_hud_container.png` (464×800). Every value sits on an 8px grid.
 *
 * Positions are expressed in container-query units (cqw/cqh) so the card scales
 * fluidly while staying pixel-accurate: at any rendered size, 1cqw = 1% of the
 * card width and maps linearly to design pixels. This also lets each equipment
 * slot re-draw its own region of the source PNG on top of the portrait via
 * `background-size: 100cqw 100cqh` + a negative offset.
 */
import type { EquipmentSlotKey } from './characterCardData';

/** Native design resolution of the container art. */
export const DESIGN_W = 464;
export const DESIGN_H = 800;

/** Uniform equipment slot box size (baked into the art). */
export const SLOT_SIZE = 48;

/** Horizontal → cqw string. */
export const cw = (px: number): string => `${(px / DESIGN_W) * 100}cqw`;
/** Vertical → cqh string. */
export const ch = (px: number): string => `${(px / DESIGN_H) * 100}cqh`;

export interface SlotPlacement {
  key: EquipmentSlotKey;
  /** Human-readable label used as the empty-slot tooltip. */
  label: string;
  x: number;
  y: number;
}

const LEFT_X = 40;
const RIGHT_X = 376;
const ROW_Y = [152, 224, 296, 368, 440, 512];
const BOTTOM_Y = 576;

/** Slot boxes in design-pixel coordinates (left column, right column, then the two centre slots). */
export const SLOT_PLACEMENTS: SlotPlacement[] = [
  { key: 'head', label: 'Head', x: LEFT_X, y: ROW_Y[0] },
  { key: 'neck', label: 'Amulet', x: LEFT_X, y: ROW_Y[1] },
  { key: 'shoulders', label: 'Shoulders', x: LEFT_X, y: ROW_Y[2] },
  { key: 'chest', label: 'Chest', x: LEFT_X, y: ROW_Y[3] },
  { key: 'back', label: 'Cloak', x: LEFT_X, y: ROW_Y[4] },
  { key: 'wrists', label: 'Bracers', x: LEFT_X, y: ROW_Y[5] },
  { key: 'hands', label: 'Gloves', x: RIGHT_X, y: ROW_Y[0] },
  { key: 'waist', label: 'Belt', x: RIGHT_X, y: ROW_Y[1] },
  { key: 'legs', label: 'Legs', x: RIGHT_X, y: ROW_Y[2] },
  { key: 'feet', label: 'Boots', x: RIGHT_X, y: ROW_Y[3] },
  { key: 'trinket', label: 'Trinket', x: RIGHT_X, y: ROW_Y[4] },
  { key: 'ring', label: 'Ring', x: RIGHT_X, y: ROW_Y[5] },
  { key: 'mainHand', label: 'Weapon', x: 176, y: BOTTOM_Y },
  { key: 'offHand', label: 'Off-hand', x: 248, y: BOTTOM_Y },
];

/**
 * Region the portrait fills, sitting *behind* the slot layer. Spans the full
 * body width so it reads behind both equipment columns, inset between the header
 * divider (~y128) and the footer divider (~y648).
 */
export const PORTRAIT_RECT = { x: 40, y: 136, w: DESIGN_W - 80, h: 496 };

/** Exp bar track — same 384px width as `character_hud_exp_bar.png`. */
export const EXP_BAR_RECT = { x: 40, y: 688, w: 384, h: 8 };

/** Palette sampled directly from the source art (kept identical per request). */
export const PALETTE = {
  bg: '#1D1D1E',
  slotFill: '#2B3032',
  gold: '#544529',
  text: '#DAC7B2',
  textMuted: '#8A8073',
  expFillFrom: '#695E45',
  expFillTo: '#6E6350',
} as const;

/** Rarity accent colors for equipped-slot glows. */
export const RARITY_COLOR: Record<string, string> = {
  legendary: '#D9A441',
  epic: '#A855F7',
  rare: '#22D3EE',
  common: '#9CA3AF',
};
