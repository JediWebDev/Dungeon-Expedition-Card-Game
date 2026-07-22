/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Dungeon graph helpers (Phase 1).
 * Navigation is still a single path, but rooms live on a node/edge map so later
 * phases can add branching, fog UI, movement points, and locked doors.
 */

import type {
  Dungeon,
  DungeonMap,
  DungeonMapEdge,
  DungeonMapNode,
  DungeonRoom,
  ExpeditionState,
  MapNodeVisibility,
} from './types';
import { generateDungeonRooms, generateId } from './utils';

function visibilityForRoomStatus(status: DungeonRoom['status']): MapNodeVisibility {
  if (status === 'cleared' || status === 'active') return 'visited';
  return 'hidden';
}

/** Rooms + linear path map (branching comes in later phases). */
export function generateDungeonLayout(
  totalRooms: number,
  dangerRating: number
): { rooms: DungeonRoom[]; map: DungeonMap } {
  const rooms = generateDungeonRooms(totalRooms, dangerRating);
  return { rooms, map: buildLinearDungeonMap(rooms) };
}

/** Build a degenerate path graph A → B → … → Boss from a linear room list. */
export function buildLinearDungeonMap(rooms: DungeonRoom[]): DungeonMap {
  if (rooms.length === 0) {
    throw new Error('Cannot build a dungeon map with zero rooms.');
  }

  // Snake layout so the path reads like a floor plan (not a single straight line).
  const COLS = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(rooms.length * 1.4))));
  const nodes: DungeonMapNode[] = rooms.map((room, i) => {
    const row = Math.floor(i / COLS);
    const colInRow = i % COLS;
    const x = row % 2 === 0 ? colInRow : COLS - 1 - colInRow;
    return {
      id: `node_${room.id}`,
      roomId: room.id,
      x,
      y: row,
      visibility: visibilityForRoomStatus(room.status),
    };
  });

  // Reveal the start and its immediate neighbor.
  nodes[0].visibility = 'visited';
  if (nodes[1] && nodes[1].visibility === 'hidden') {
    nodes[1].visibility = 'revealed';
  }

  const edges: DungeonMapEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: generateId(),
      fromNodeId: nodes[i].id,
      toNodeId: nodes[i + 1].id,
      locked: false,
      requiredKeyId: null,
    });
  }

  return {
    nodes,
    edges,
    startNodeId: nodes[0].id,
    bossNodeId: nodes[nodes.length - 1].id,
  };
}

/** Attach a linear map when missing; upgrade flat Phase-1 paths to snake layout. */
export function ensureDungeonMap(dungeon: Dungeon): Dungeon {
  const rooms = dungeon.rooms ?? [];
  if (rooms.length === 0) return dungeon;
  if (!dungeon.map?.nodes?.length) {
    return { ...dungeon, map: buildLinearDungeonMap(rooms) };
  }

  const map = dungeon.map;
  const isFlatLine = map.nodes.length > 3 && map.nodes.every((n) => n.y === 0);
  if (!isFlatLine) return dungeon;

  const rebuilt = buildLinearDungeonMap(rooms);
  const oldVis = new Map<string, MapNodeVisibility>(
    map.nodes.map((n) => [n.roomId, n.visibility])
  );
  return {
    ...dungeon,
    map: {
      ...rebuilt,
      nodes: rebuilt.nodes.map((n): DungeonMapNode => ({
        id: n.id,
        roomId: n.roomId,
        x: n.x,
        y: n.y,
        visibility: oldVis.get(n.roomId) ?? n.visibility,
      })),
    },
  };
}

export function getMap(expedition: ExpeditionState): DungeonMap | null {
  const dungeon = ensureDungeonMap(expedition.dungeon);
  return dungeon.map ?? null;
}

export function getRoomById(dungeon: Dungeon, roomId: string): DungeonRoom | undefined {
  return (dungeon.rooms ?? []).find((r) => r.id === roomId);
}

export function getNodeById(map: DungeonMap, nodeId: string): DungeonMapNode | undefined {
  return map.nodes.find((n) => n.id === nodeId);
}

export function getNodeForRoomIndex(map: DungeonMap, rooms: DungeonRoom[], index: number): DungeonMapNode | undefined {
  const room = rooms[index];
  if (!room) return undefined;
  return map.nodes.find((n) => n.roomId === room.id);
}

/** Resolve the active room from `currentNodeId`, falling back to `currentRoomIndex`. */
export function resolveActiveRoom(expedition: ExpeditionState): DungeonRoom {
  const dungeon = ensureDungeonMap(expedition.dungeon);
  const rooms = dungeon.rooms ?? [];
  const map = dungeon.map;

  if (map && expedition.currentNodeId) {
    const node = getNodeById(map, expedition.currentNodeId);
    if (node) {
      const room = getRoomById(dungeon, node.roomId);
      if (room) return room;
    }
  }

  const room = rooms[expedition.currentRoomIndex];
  if (!room) throw new Error('Active room data is missing for this expedition.');
  return room;
}

export function resolveActiveRoomIndex(expedition: ExpeditionState): number {
  const room = resolveActiveRoom(expedition);
  const idx = (expedition.dungeon.rooms ?? []).findIndex((r) => r.id === room.id);
  return idx >= 0 ? idx : expedition.currentRoomIndex;
}

export function resolveCurrentNodeId(expedition: ExpeditionState): string | undefined {
  if (expedition.currentNodeId) return expedition.currentNodeId;
  const dungeon = ensureDungeonMap(expedition.dungeon);
  const map = dungeon.map;
  if (!map) return undefined;
  const node = getNodeForRoomIndex(map, dungeon.rooms ?? [], expedition.currentRoomIndex);
  return node?.id;
}

/** Single outgoing edge from a node on a path map (Phase 1). */
export function getOutgoingEdges(map: DungeonMap, nodeId: string): DungeonMapEdge[] {
  return map.edges.filter((e) => e.fromNodeId === nodeId);
}

export function getNextNodeId(map: DungeonMap, currentNodeId: string): string | null {
  const outgoing = getOutgoingEdges(map, currentNodeId);
  return outgoing[0]?.toNodeId ?? null;
}

/**
 * Mark the previous room/node cleared, activate the next, reveal the following
 * neighbor, and keep `currentRoomIndex` / `currentNodeId` aligned.
 */
export function advanceAlongPath(
  expedition: ExpeditionState,
  nextNodeId: string
): Pick<ExpeditionState, 'dungeon' | 'currentRoomIndex' | 'currentNodeId'> {
  const dungeon = ensureDungeonMap(expedition.dungeon);
  const map = dungeon.map!;
  const rooms = dungeon.rooms ?? [];
  const currentNodeId = resolveCurrentNodeId(expedition);
  const nextNode = getNodeById(map, nextNodeId);
  if (!nextNode) throw new Error('Next map node not found.');

  const nextRoomIndex = rooms.findIndex((r) => r.id === nextNode.roomId);
  if (nextRoomIndex < 0) throw new Error('Next room not found for map node.');

  const currentRoomId = currentNodeId
    ? getNodeById(map, currentNodeId)?.roomId
    : rooms[expedition.currentRoomIndex]?.id;

  const nextRooms = rooms.map((r) => {
    if (currentRoomId && r.id === currentRoomId) return { ...r, status: 'cleared' as const };
    if (r.id === nextNode.roomId) return { ...r, status: 'active' as const };
    return r;
  });

  const followingId = getNextNodeId(map, nextNodeId);
  const nextNodes = map.nodes.map((n) => {
    if (currentNodeId && n.id === currentNodeId) return { ...n, visibility: 'visited' as const };
    if (n.id === nextNodeId) return { ...n, visibility: 'visited' as const };
    if (followingId && n.id === followingId && n.visibility === 'hidden') {
      return { ...n, visibility: 'revealed' as const };
    }
    return n;
  });

  return {
    dungeon: {
      ...dungeon,
      rooms: nextRooms,
      map: { ...map, nodes: nextNodes },
    },
    currentRoomIndex: nextRoomIndex,
    currentNodeId: nextNodeId,
  };
}

/** Patch a room (e.g. monster HP) while preserving map linkage. */
export function updateActiveRoom(
  expedition: ExpeditionState,
  patch: Partial<DungeonRoom>
): ExpeditionState {
  const active = resolveActiveRoom(expedition);
  const rooms = (expedition.dungeon.rooms ?? []).map((r) =>
    r.id === active.id ? { ...r, ...patch } : r
  );
  return {
    ...expedition,
    dungeon: ensureDungeonMap({ ...expedition.dungeon, rooms }),
  };
}

/** Upgrade a legacy expedition snapshot to include map + currentNodeId. */
export function migrateExpeditionMap(exp: ExpeditionState): ExpeditionState {
  const dungeon = ensureDungeonMap(exp.dungeon);
  const map = dungeon.map;
  let currentNodeId = exp.currentNodeId;
  if (!currentNodeId && map) {
    currentNodeId = getNodeForRoomIndex(map, dungeon.rooms ?? [], exp.currentRoomIndex)?.id;
  }

  // Re-sync fog from room statuses so mid-run saves look correct on the map.
  let syncedDungeon = dungeon;
  if (map) {
    const rooms = dungeon.rooms ?? [];
    const roomById = new Map(rooms.map((r) => [r.id, r]));
    const currentIdx = rooms.findIndex((r) => {
      const node = map.nodes.find((n) => n.id === currentNodeId);
      return node ? r.id === node.roomId : false;
    });
    const nextNodes: DungeonMapNode[] = map.nodes.map((n) => {
      const room = roomById.get(n.roomId);
      if (!room) return n;
      if (room.status === 'cleared' || room.status === 'active') {
        return { ...n, visibility: 'visited' as const };
      }
      const roomIndex = rooms.findIndex((r) => r.id === n.roomId);
      if (currentIdx >= 0 && roomIndex === currentIdx + 1) {
        return { ...n, visibility: 'revealed' as const };
      }
      const fog: MapNodeVisibility = n.visibility === 'revealed' ? 'revealed' : 'hidden';
      return { ...n, visibility: fog };
    });
    syncedDungeon = { ...dungeon, map: { ...map, nodes: nextNodes } };
  }

  return {
    ...exp,
    dungeon: syncedDungeon,
    currentNodeId: currentNodeId ?? map?.startNodeId,
  };
}

export function countVisitedNodes(map: DungeonMap): number {
  return map.nodes.filter((n) => n.visibility === 'visited').length;
}

export function isEdgeVisible(map: DungeonMap, edge: DungeonMapEdge): boolean {
  const from = getNodeById(map, edge.fromNodeId);
  const to = getNodeById(map, edge.toNodeId);
  if (!from || !to) return false;
  // Show a corridor if either end is known; hidden↔hidden stays in the fog.
  return from.visibility !== 'hidden' || to.visibility !== 'hidden';
}
