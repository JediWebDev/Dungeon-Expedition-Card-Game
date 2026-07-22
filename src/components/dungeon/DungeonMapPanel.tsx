/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import type { Dungeon, DungeonMapNode, DungeonRoom, RoomType } from '../../types';
import {
  ensureDungeonMap,
  getNodeById,
  getRoomById,
  isEdgeVisible,
} from '../../dungeonMap';
import { uiPanel } from '../ui/UiTextHeader';

const CELL = 96;
const ROOM = 64;
const CORRIDOR_THICK = 14;
const PAD = 40;

const ROOM_FILL: Record<RoomType, string> = {
  Monster: '#4a3f3a',
  'Elite Monster': '#5a3030',
  Boss: '#6b3a1a',
  Treasure: '#3a4a3a',
  Campfire: '#4a3a28',
  Merchant: '#3a3a4a',
  Trap: '#4a4a30',
  'Mystery Event': '#3a304a',
};

const ROOM_GLYPH: Record<RoomType, string> = {
  Monster: '⚔',
  'Elite Monster': '☠',
  Boss: '♛',
  Treasure: '▣',
  Campfire: '♨',
  Merchant: '⚖',
  Trap: '⚠',
  'Mystery Event': '?',
};

function roomCenter(node: DungeonMapNode): { cx: number; cy: number } {
  return {
    cx: PAD + node.x * CELL + ROOM / 2,
    cy: PAD + node.y * CELL + ROOM / 2,
  };
}

function roomSizeForType(type: RoomType | undefined, visibility: DungeonMapNode['visibility']): number {
  if (visibility === 'revealed') return ROOM * 0.85;
  if (type === 'Boss') return ROOM * 1.15;
  if (type === 'Elite Monster') return ROOM * 1.05;
  return ROOM;
}

interface DungeonMapPanelProps {
  dungeon: Dungeon;
  currentNodeId?: string | null;
  /** Adjacent node ids the party can move to right now. */
  movableNodeIds?: string[];
  onMoveToNode?: (nodeId: string) => void;
  movementPoints?: number;
  maxMovementPoints?: number;
  className?: string;
}

/**
 * Top-down fog-of-war dungeon map. Hidden nodes are omitted; revealed nodes are
 * blank silhouettes; visited nodes show room type. Click highlighted neighbors
 * to spend a movement point and travel.
 */
export const DungeonMapPanel: React.FC<DungeonMapPanelProps> = ({
  dungeon: rawDungeon,
  currentNodeId,
  movableNodeIds = [],
  onMoveToNode,
  movementPoints,
  maxMovementPoints,
  className = '',
}) => {
  const dungeon = useMemo(() => ensureDungeonMap(rawDungeon), [rawDungeon]);
  const map = dungeon.map;
  const movable = useMemo(() => new Set(movableNodeIds), [movableNodeIds]);

  const layout = useMemo(() => {
    if (!map) return null;
    const maxX = Math.max(...map.nodes.map((n) => n.x), 0);
    const maxY = Math.max(...map.nodes.map((n) => n.y), 0);
    const width = PAD * 2 + (maxX + 1) * CELL;
    const height = PAD * 2 + (maxY + 1) * CELL;
    return { width, height };
  }, [map]);

  if (!map || !layout) {
    return (
      <div className={`${uiPanel} p-4 ${className}`}>
        <p className="text-xs text-stone-400 font-sans">Dungeon map unavailable.</p>
      </div>
    );
  }

  const showMp = typeof movementPoints === 'number' && typeof maxMovementPoints === 'number';

  return (
    <div className={`${uiPanel} flex flex-col min-h-0 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-[#D7BF92]/30">
        <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#D7BF92] font-sans">
          Dungeon Map
        </h3>
        <div className="flex flex-wrap gap-3 text-[9px] font-sans text-stone-400 uppercase tracking-wider">
          {showMp && (
            <span className="text-[#D7BF92] font-bold normal-case tracking-wide">
              Movement {movementPoints}/{maxMovementPoints}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#D7BF92]" /> You are here
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm border border-emerald-500/80 bg-emerald-900/40" /> Can move
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#2a2826] border border-stone-600" /> Scouted
          </span>
          <span className="flex items-center gap-1.5 text-stone-500">Unexplored is fog</span>
        </div>
      </div>

      <div className="overflow-auto p-2 flex-1 min-h-[160px] max-h-[280px] bg-[#141312]/90">
        <svg
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="mx-auto block"
          style={{ minWidth: layout.width, minHeight: layout.height, width: '100%', height: 'auto', maxHeight: 260 }}
          role="img"
          aria-label="Dungeon floor plan with fog of war"
        >
          <rect x={0} y={0} width={layout.width} height={layout.height} fill="#0c0b0a" />

          {map.edges.filter((e) => isEdgeVisible(map, e)).map((edge) => {
            const from = getNodeById(map, edge.fromNodeId);
            const to = getNodeById(map, edge.toNodeId);
            if (!from || !to) return null;
            return (
              <Corridor
                key={edge.id}
                from={from}
                to={to}
                dimmed={from.visibility === 'hidden' || to.visibility === 'hidden'}
                locked={Boolean(edge.locked)}
              />
            );
          })}

          {map.nodes.map((node) => {
            if (node.visibility === 'hidden') return null;
            const room = getRoomById(dungeon, node.roomId);
            const isCurrent = node.id === currentNodeId;
            const canMove = movable.has(node.id);
            return (
              <RoomNode
                key={node.id}
                node={node}
                room={room}
                isCurrent={isCurrent}
                isBoss={map.bossNodeId === node.id}
                canMove={canMove}
                onSelect={canMove && onMoveToNode ? () => onMoveToNode(node.id) : undefined}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
};

function Corridor({
  from,
  to,
  dimmed,
  locked,
}: {
  from: DungeonMapNode;
  to: DungeonMapNode;
  dimmed: boolean;
  locked: boolean;
}) {
  const a = roomCenter(from);
  const b = roomCenter(to);
  const fill = locked ? '#6b4a2a' : dimmed ? '#2a2826' : '#4a4640';
  const stroke = locked ? '#D7BF92' : '#6a655c';

  if (a.cx === b.cx || a.cy === b.cy) {
    const x = Math.min(a.cx, b.cx) - CORRIDOR_THICK / 2;
    const y = Math.min(a.cy, b.cy) - CORRIDOR_THICK / 2;
    const w = a.cx === b.cx ? CORRIDOR_THICK : Math.abs(b.cx - a.cx) + CORRIDOR_THICK;
    const h = a.cy === b.cy ? CORRIDOR_THICK : Math.abs(b.cy - a.cy) + CORRIDOR_THICK;
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
        opacity={dimmed ? 0.45 : 0.9}
      />
    );
  }

  const midX = b.cx;
  const midY = a.cy;
  const hX = Math.min(a.cx, midX) - CORRIDOR_THICK / 2;
  const hW = Math.abs(midX - a.cx) + CORRIDOR_THICK;
  const vY = Math.min(midY, b.cy) - CORRIDOR_THICK / 2;
  const vH = Math.abs(b.cy - midY) + CORRIDOR_THICK;

  return (
    <g opacity={dimmed ? 0.45 : 0.9}>
      <rect
        x={hX}
        y={midY - CORRIDOR_THICK / 2}
        width={hW}
        height={CORRIDOR_THICK}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
      <rect
        x={midX - CORRIDOR_THICK / 2}
        y={vY}
        width={CORRIDOR_THICK}
        height={vH}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
    </g>
  );
}

function RoomNode({
  node,
  room,
  isCurrent,
  isBoss,
  canMove,
  onSelect,
}: {
  node: DungeonMapNode;
  room: DungeonRoom | undefined;
  isCurrent: boolean;
  isBoss: boolean;
  canMove: boolean;
  onSelect?: () => void;
}) {
  const size = roomSizeForType(room?.type, node.visibility);
  const { cx, cy } = roomCenter(node);
  const x = cx - size / 2;
  const y = cy - size / 2;
  const revealedOnly = node.visibility === 'revealed';
  const fill = revealedOnly ? '#2a2826' : ROOM_FILL[room?.type ?? 'Monster'] ?? '#3a3834';
  const stroke = isCurrent
    ? '#D7BF92'
    : canMove
      ? '#6ee7b7'
      : revealedOnly
        ? '#5a5550'
        : '#8a8073';
  const strokeWidth = isCurrent || canMove ? 3 : isBoss && !revealedOnly ? 2.5 : 1.5;
  const label = revealedOnly ? '?' : ROOM_GLYPH[room?.type ?? 'Monster'] ?? '·';
  const title = canMove
    ? `Move here (−1 MP)${revealedOnly ? ' — unexplored' : room ? `: ${room.name}` : ''}`
    : revealedOnly
      ? 'Unexplored chamber'
      : room
        ? `${room.name} (${room.type})`
        : 'Chamber';

  return (
    <g
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
    >
      <title>{title}</title>
      {isCurrent && (
        <rect
          x={x - 4}
          y={y - 4}
          width={size + 8}
          height={size + 8}
          fill="none"
          stroke="#D7BF92"
          strokeWidth={1}
          opacity={0.45}
          rx={2}
        >
          <animate attributeName="opacity" values="0.25;0.7;0.25" dur="2s" repeatCount="indefinite" />
        </rect>
      )}
      {canMove && !isCurrent && (
        <rect
          x={x - 3}
          y={y - 3}
          width={size + 6}
          height={size + 6}
          fill="none"
          stroke="#6ee7b7"
          strokeWidth={1}
          opacity={0.55}
          rx={2}
        >
          <animate attributeName="opacity" values="0.3;0.85;0.3" dur="1.6s" repeatCount="indefinite" />
        </rect>
      )}
      <rect
        x={x}
        y={y}
        width={size}
        height={size}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        rx={2}
      />
      <rect
        x={x + 3}
        y={y + 3}
        width={size - 6}
        height={size - 6}
        fill="none"
        stroke="#00000055"
        strokeWidth={1}
        rx={1}
      />
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        fontSize={revealedOnly ? 16 : 14}
        fill={revealedOnly ? '#6a655c' : '#DAC7B2'}
        style={{ userSelect: 'none', pointerEvents: 'none' }}
      >
        {label}
      </text>
    </g>
  );
}
