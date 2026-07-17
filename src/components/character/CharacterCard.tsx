/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Portrait } from '../Portrait';
import containerArt from '../../assets/ui/character_hud_container.png';
import {
  CharacterCardData,
  CharacterStatBlock,
  EquipmentSlotKey,
} from './characterCardData';
import { EquipmentSlot } from './EquipmentSlot';
import {
  DESIGN_W,
  DESIGN_H,
  EXP_BAR_RECT,
  PALETTE,
  PORTRAIT_RECT,
  SLOT_PLACEMENTS,
  cw,
  ch,
} from './characterCardLayout';

interface CharacterCardProps {
  data: CharacterCardData;
  /** Fired when an equipment slot is clicked (only interactive if provided). */
  onSlotClick?: (slot: EquipmentSlotKey) => void;
  /**
   * Restrict which slots are clickable. When omitted, all slots are interactive
   * (given `onSlotClick`). Useful when only some slots are backed by real gear.
   */
  interactiveSlots?: EquipmentSlotKey[];
  className?: string;
}

interface StatCell {
  key: keyof CharacterStatBlock;
  label: string;
  col: 0 | 1 | 2;
  row: 0 | 1;
}

const STAT_CELLS: StatCell[] = [
  { key: 'attack', label: 'Attack', col: 0, row: 0 },
  { key: 'magic', label: 'Magic', col: 1, row: 0 },
  { key: 'speed', label: 'Speed', col: 2, row: 0 },
  { key: 'defense', label: 'Defense', col: 0, row: 1 },
  { key: 'resist', label: 'Resist', col: 1, row: 1 },
  { key: 'luck', label: 'Luck', col: 2, row: 1 },
];

const STAT_COL_X = [40, 192, 320];
const STAT_ROW_Y = [704, 742];

/**
 * Pixel-perfect character sheet built on the `character_hud_container` art.
 *
 * Layering (back → front): frame PNG → portrait → equipment slots → HUD text.
 * The portrait fills the body and therefore reads *behind* the slot boxes, which
 * re-draw themselves from the same PNG so the baked slot art stays intact.
 */
export const CharacterCard: React.FC<CharacterCardProps> = ({
  data,
  onSlotClick,
  interactiveSlots,
  className = '',
}) => {
  const {
    name,
    className: heroClassName,
    level,
    hp,
    maxHp,
    mp,
    maxMp,
    morale,
    exp,
    expNeeded,
    stats,
    bonuses,
    equipment,
    portrait,
  } = data;

  const expPct = expNeeded > 0 ? Math.max(0, Math.min(100, (exp / expNeeded) * 100)) : 0;
  const hasMp = typeof maxMp === 'number' && maxMp > 0;

  const cardStyle = {
    width: '100%',
    maxWidth: `${DESIGN_W}px`,
    aspectRatio: `${DESIGN_W} / ${DESIGN_H}`,
    containerType: 'size',
    backgroundColor: PALETTE.bg,
  } as React.CSSProperties;

  const bonusOf = (key: keyof CharacterStatBlock): number => bonuses?.[key] ?? 0;

  return (
    <div
      className={`relative select-none overflow-hidden rounded-md shadow-2xl ${className}`}
      style={cardStyle}
    >
      {/* Layer 0 — the frame art (flourishes, dividers, baked slot boxes). Opaque. */}
      <img
        src={containerArt}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/*
        Layer 1 — portrait. Drawn *over* the opaque frame in the body window, so
        it reveals the hero in the centre. It spans both equipment columns, and
        the slot layer (below) is re-drawn on top — so the portrait sits behind
        the equipment slots, as required.
      */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: cw(PORTRAIT_RECT.x),
          top: ch(PORTRAIT_RECT.y),
          width: cw(PORTRAIT_RECT.w),
          height: ch(PORTRAIT_RECT.h),
        }}
      >
        <Portrait
          heroClass={portrait.heroClass}
          portraitSeed={portrait.portraitSeed}
          isDead={portrait.isDead}
          size="fill"
          className="!rounded-none !border-0 !shadow-none"
        />
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(29,29,30,0) 30%, rgba(29,29,30,0.7) 100%), linear-gradient(to bottom, rgba(29,29,30,0.45), rgba(29,29,30,0.05) 22%, rgba(29,29,30,0.05) 68%, rgba(29,29,30,0.7))',
          }}
        />
      </div>

      {/* Layer 2 — equipment slots (re-drawn from the PNG, above the portrait). */}
      {SLOT_PLACEMENTS.map((slot) => {
        const isInteractive =
          Boolean(onSlotClick) && (!interactiveSlots || interactiveSlots.includes(slot.key));
        return (
          <EquipmentSlot
            key={slot.key}
            label={slot.label}
            x={slot.x}
            y={slot.y}
            spriteUrl={containerArt}
            item={equipment[slot.key] ?? null}
            onClick={isInteractive ? () => onSlotClick!(slot.key) : undefined}
          />
        );
      })}

      {/* Layer 3 — HUD text overlays. */}
      {/* Title */}
      <div
        className="absolute text-center font-serif font-bold uppercase"
        style={{ left: 0, top: ch(16), width: cw(DESIGN_W), fontSize: cw(20), letterSpacing: cw(1), color: PALETTE.text }}
      >
        {name}
      </div>

      {/* HP / MP (left) */}
      <div className="absolute font-serif" style={{ left: cw(24), top: ch(62), fontSize: cw(13) }}>
        <span style={{ color: PALETTE.textMuted }}>HP:</span>
        <span style={{ color: PALETTE.text }}>
          {hp}/{maxHp}
        </span>
      </div>
      {hasMp && (
        <div className="absolute font-serif" style={{ left: cw(24), top: ch(86), fontSize: cw(13) }}>
          <span style={{ color: PALETTE.textMuted }}>MP:</span>
          <span style={{ color: PALETTE.text }}>
            {mp}/{maxMp}
          </span>
        </div>
      )}

      {/* Class + level (center) */}
      <div
        className="absolute text-center font-serif font-bold uppercase"
        style={{ left: 0, top: ch(64), width: cw(DESIGN_W), fontSize: cw(14), letterSpacing: cw(0.5), color: PALETTE.text }}
      >
        {heroClassName}
      </div>
      <div
        className="absolute text-center font-serif"
        style={{ left: 0, top: ch(88), width: cw(DESIGN_W), fontSize: cw(11), letterSpacing: cw(0.5), color: PALETTE.textMuted }}
      >
        Level {level}
      </div>

      {/* Morale (right) */}
      <div
        className="absolute text-right font-serif"
        style={{ left: 0, top: ch(80), width: cw(DESIGN_W), paddingRight: cw(24), fontSize: cw(12) }}
      >
        <span style={{ color: PALETTE.textMuted }}>Morale: </span>
        <span style={{ color: PALETTE.text }}>{morale}</span>
      </div>

      {/* Exp label + value */}
      <div
        className="absolute font-serif uppercase"
        style={{ left: cw(EXP_BAR_RECT.x), top: ch(656), fontSize: cw(11), letterSpacing: cw(0.5), color: PALETTE.textMuted }}
      >
        Exp
      </div>
      <div
        className="absolute text-right font-serif"
        style={{
          left: 0,
          top: ch(656),
          width: cw(EXP_BAR_RECT.x + EXP_BAR_RECT.w),
          fontSize: cw(11),
          color: PALETTE.text,
        }}
      >
        {exp}/{expNeeded}
      </div>

      {/* Exp bar */}
      <div
        className="absolute rounded-full"
        style={{
          left: cw(EXP_BAR_RECT.x),
          top: ch(EXP_BAR_RECT.y),
          width: cw(EXP_BAR_RECT.w),
          height: ch(EXP_BAR_RECT.h),
          backgroundColor: '#141414',
          border: `1px solid ${PALETTE.gold}`,
        }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${expPct}%`,
            background: `linear-gradient(to right, ${PALETTE.expFillFrom}, ${PALETTE.expFillTo})`,
          }}
        />
      </div>

      {/* Stats grid */}
      {STAT_CELLS.map((cell) => {
        const bonus = bonusOf(cell.key);
        return (
          <div
            key={cell.key}
            className="absolute font-serif uppercase whitespace-nowrap"
            style={{ left: cw(STAT_COL_X[cell.col]), top: ch(STAT_ROW_Y[cell.row]), fontSize: cw(11) }}
          >
            <span style={{ color: PALETTE.textMuted }}>{cell.label}: </span>
            <span style={{ color: PALETTE.text }}>{stats[cell.key]}</span>
            {bonus !== 0 && (
              <span style={{ color: PALETTE.gold }}> {bonus > 0 ? `+(${bonus})` : `(${bonus})`}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};
