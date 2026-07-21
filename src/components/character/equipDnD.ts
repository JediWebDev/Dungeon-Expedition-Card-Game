/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DragEvent } from 'react';
import type { EquipSlot } from '../../types';

export const EQUIP_DND_MIME = 'application/x-guild-equip';

export type EquipDragPayload =
  | { source: 'inventory'; itemId: string; itemType: EquipSlot }
  | { source: 'slot'; slot: EquipSlot; itemId: string; itemType: EquipSlot };

export function writeEquipDrag(e: DragEvent, payload: EquipDragPayload): void {
  e.dataTransfer.setData(EQUIP_DND_MIME, JSON.stringify(payload));
  e.dataTransfer.effectAllowed = 'move';
}

export function readEquipDrag(e: DragEvent): EquipDragPayload | null {
  const raw = e.dataTransfer.getData(EQUIP_DND_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as EquipDragPayload;
  } catch {
    return null;
  }
}
