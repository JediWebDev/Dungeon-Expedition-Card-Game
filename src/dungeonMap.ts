/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Dungeon graph helpers (Phases 1–3).
 * Branching maps, fog of war, and movement-point navigation.
 */

import type {
  Dungeon,
  DungeonMap,
  DungeonMapEdge,
  DungeonMapNode,
  DungeonRoom,
  ExpeditionKey,
  ExpeditionState,
  MapNodeVisibility,
  RoomType,
} from './types';
import {
  createDungeonRoom,
  defaultMovementBudget,
  generateId,
  pickRegularRoomType,
} from './utils';

const MOVE_COST = 1;
const CAMPFIRE_MP_RESTORE = 3;
const KEY_NAMES = ['Iron Key', 'Bronze Key', 'Silver Key', 'Vault Key'] as const;

function visibilityForRoomStatus(status: DungeonRoom['status']): MapNodeVisibility {
  if (status === 'cleared' || status === 'active') return 'visited';
  return 'hidden';
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/** Rooms + branching map (Phase 3). */
export function generateDungeonLayout(
  totalRooms: number,
  dangerRating: number
): { rooms: DungeonRoom[]; map: DungeonMap } {
  return buildBranchingDungeon(Math.max(4, totalRooms), dangerRating);
}

/**
 * Main spine toward the boss + optional side branches.
 * Corridors are undirected for movement (stored as from→to edges).
 */
function buildBranchingDungeon(
  totalRooms: number,
  dangerRating: number
): { rooms: DungeonRoom[]; map: DungeonMap } {
  type Slot = {
    x: number;
    y: number;
    parentIndex: number | null;
    role: 'start' | 'main' | 'boss' | 'branch';
  };

  const mainLen =
    totalRooms <= 5
      ? totalRooms
      : Math.max(4, Math.min(totalRooms - 1, Math.ceil(totalRooms * 0.62)));

  const slots: Slot[] = [];
  const occupied = new Set<string>();

  for (let i = 0; i < mainLen; i++) {
    const x = i;
    const y = 0;
    occupied.add(cellKey(x, y));
    slots.push({
      x,
      y,
      parentIndex: i === 0 ? null : i - 1,
      role: i === 0 ? 'start' : i === mainLen - 1 ? 'boss' : 'main',
    });
  }

  let remaining = totalRooms - mainLen;
  const dirs: Array<[number, number]> = [
    [0, -1],
    [0, 1],
    [1, 0],
    [-1, 0],
  ];

  const tryAttach = (
    hostIndex: number,
    preferExtend: boolean,
    perpendicularOnly: boolean
  ): boolean => {
    const host = slots[hostIndex];
    if (!host) return false;
    const candidateDirs = perpendicularOnly
      ? ([
          [0, -1],
          [0, 1],
        ] as Array<[number, number]>)
      : dirs;
    const order = shuffleInPlace([...candidateDirs]);
    for (const [dx, dy] of order) {
      const nx = host.x + dx;
      const ny = host.y + dy;
      if (occupied.has(cellKey(nx, ny))) continue;
      occupied.add(cellKey(nx, ny));
      const newIndex = slots.length;
      slots.push({ x: nx, y: ny, parentIndex: hostIndex, role: 'branch' });
      remaining--;

      if (preferExtend && remaining > 0 && Math.random() > 0.4) {
        const nx2 = nx + dx;
        const ny2 = ny + dy;
        if (!occupied.has(cellKey(nx2, ny2))) {
          occupied.add(cellKey(nx2, ny2));
          slots.push({ x: nx2, y: ny2, parentIndex: newIndex, role: 'branch' });
          remaining--;
        }
      }
      return true;
    }
    return false;
  };

  // Prefer branching off mid-spine rooms (not start/boss), perpendicular to the spine.
  const spineHosts = slots
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.role === 'main')
    .map(({ i }) => i);
  shuffleInPlace(spineHosts);

  let guard = 0;
  while (remaining > 0 && guard++ < 200) {
    if (spineHosts.length > 0 && Math.random() > 0.2) {
      const hostIndex = spineHosts[Math.floor(Math.random() * spineHosts.length)]!;
      if (tryAttach(hostIndex, true, true)) continue;
    }
    // Fall back: grow from existing branch tips (any direction).
    const branchHosts = slots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.role === 'branch')
      .map(({ i }) => i);
    shuffleInPlace(branchHosts);
    let placed = false;
    for (const hostIndex of [...branchHosts, ...spineHosts]) {
      const host = slots[hostIndex]!;
      if (tryAttach(hostIndex, remaining > 1, host.role !== 'branch')) {
        placed = true;
        break;
      }
    }
    if (!placed) break;
  }

  // Type assignment: start, boss, guaranteed campfire on spine, rest weighted.
  const types: RoomType[] = slots.map((slot) => {
    if (slot.role === 'start') return Math.random() > 0.5 ? 'Treasure' : 'Monster';
    if (slot.role === 'boss') return 'Boss';
    return pickRegularRoomType();
  });

  const mainIndices = slots
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.role === 'main')
    .map(({ i }) => i);
  if (mainIndices.length > 0 && !types.some((t) => t === 'Campfire')) {
    const campIdx = mainIndices[Math.floor(mainIndices.length / 2)]!;
    types[campIdx] = 'Campfire';
  }

  const rooms: DungeonRoom[] = slots.map((slot, i) =>
    createDungeonRoom(types[i]!, dangerRating, i, i === 0 ? 'active' : 'upcoming')
  );

  const nodes: DungeonMapNode[] = slots.map((slot, i) => ({
    id: `node_${rooms[i]!.id}`,
    roomId: rooms[i]!.id,
    x: slot.x,
    y: slot.y,
    visibility: visibilityForRoomStatus(rooms[i]!.status),
  }));

  nodes[0]!.visibility = 'visited';

  const edges: DungeonMapEdge[] = [];
  for (let i = 0; i < slots.length; i++) {
    const parent = slots[i]!.parentIndex;
    if (parent == null) continue;
    edges.push({
      id: generateId(),
      fromNodeId: nodes[parent]!.id,
      toNodeId: nodes[i]!.id,
      locked: false,
      requiredKeyId: null,
    });
  }

  // Reveal all neighbors of the start.
  for (const nid of getAdjacentNodeIds({ nodes, edges, startNodeId: nodes[0]!.id, bossNodeId: nodes[mainLen - 1]!.id }, nodes[0]!.id)) {
    const n = nodes.find((x) => x.id === nid);
    if (n && n.visibility === 'hidden') n.visibility = 'revealed';
  }

  const bossSlotIndex = slots.findIndex((s) => s.role === 'boss');
  const map: DungeonMap = {
    nodes,
    edges,
    startNodeId: nodes[0]!.id,
    bossNodeId: nodes[bossSlotIndex >= 0 ? bossSlotIndex : nodes.length - 1]!.id,
  };

  return applyLockedDoorsAndKeys(map, rooms, dangerRating);
}

/** Lock branch corridors and hide matching keys in reachable side rooms. */
function applyLockedDoorsAndKeys(
  map: DungeonMap,
  rooms: DungeonRoom[],
  dangerRating: number
): { rooms: DungeonRoom[]; map: DungeonMap } {
  const nodeById = new Map(map.nodes.map((n) => [n.id, n]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));

  // Branch-entry edges: spine/main → side branch (child off y=0 spine).
  const branchEntryEdges = map.edges.filter((edge) => {
    const from = nodeById.get(edge.fromNodeId);
    const to = nodeById.get(edge.toNodeId);
    if (!from || !to) return false;
    return from.y === 0 && to.y !== 0;
  });

  if (branchEntryEdges.length === 0) {
    return { rooms, map };
  }

  shuffleInPlace(branchEntryEdges);
  const lockCount = Math.min(
    branchEntryEdges.length,
    dangerRating >= 4 ? 2 : dangerRating >= 2 ? 1 : 0
  );
  if (lockCount === 0) {
    return { rooms, map };
  }

  const lockedEdges = branchEntryEdges.slice(0, lockCount);
  const keysToPlace: ExpeditionKey[] = lockedEdges.map((_, i) => ({
    id: generateId(),
    name: KEY_NAMES[i % KEY_NAMES.length]!,
  }));

  const nextEdges = map.edges.map((edge) => {
    const lockIdx = lockedEdges.findIndex((le) => le.id === edge.id);
    if (lockIdx < 0) return edge;
    return {
      ...edge,
      locked: true,
      requiredKeyId: keysToPlace[lockIdx]!.id,
    };
  });

  const reachableWithoutKeys = getReachableNodeIds({ ...map, edges: nextEdges }, map.startNodeId, []);
  const keyRoomCandidates = [...reachableWithoutKeys]
    .map((nodeId) => {
      const node = nodeById.get(nodeId);
      const room = node ? roomById.get(node.roomId) : undefined;
      return room && (room.type === 'Treasure' || room.type === 'Monster') ? room : null;
    })
    .filter((r): r is DungeonRoom => Boolean(r));

  shuffleInPlace(keyRoomCandidates);
  let nextRooms = [...rooms];
  keysToPlace.forEach((key, i) => {
    const host = keyRoomCandidates[i % Math.max(1, keyRoomCandidates.length)];
    if (!host) return;
    nextRooms = nextRooms.map((r) =>
      r.id === host.id ? { ...r, keyGrant: key } : r
    );
  });

  return {
    rooms: nextRooms,
    map: { ...map, edges: nextEdges },
  };
}

/** Build a degenerate path graph A → B → … → Boss (legacy / migration). */
export function buildLinearDungeonMap(rooms: DungeonRoom[]): DungeonMap {
  if (rooms.length === 0) {
    throw new Error('Cannot build a dungeon map with zero rooms.');
  }

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

  nodes[0]!.visibility = 'visited';
  if (nodes[1] && nodes[1].visibility === 'hidden') {
    nodes[1].visibility = 'revealed';
  }

  const edges: DungeonMapEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: generateId(),
      fromNodeId: nodes[i]!.id,
      toNodeId: nodes[i + 1]!.id,
      locked: false,
      requiredKeyId: null,
    });
  }

  return {
    nodes,
    edges,
    startNodeId: nodes[0]!.id,
    bossNodeId: nodes[nodes.length - 1]!.id,
  };
}

/** Attach a map when missing; upgrade flat Phase-1 paths to snake layout. */
export function ensureDungeonMap(dungeon: Dungeon): Dungeon {
  const rooms = dungeon.rooms ?? [];
  if (rooms.length === 0) return dungeon;
  if (!dungeon.map?.nodes?.length) {
    return { ...dungeon, map: buildLinearDungeonMap(rooms) };
  }

  const map = dungeon.map;
  // Flat Phase-1 line only (branching maps place side rooms off y=0).
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
      nodes: rebuilt.nodes.map(
        (n): DungeonMapNode => ({
          id: n.id,
          roomId: n.roomId,
          x: n.x,
          y: n.y,
          visibility: oldVis.get(n.roomId) ?? n.visibility,
        })
      ),
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

export function getNodeForRoomIndex(
  map: DungeonMap,
  rooms: DungeonRoom[],
  index: number
): DungeonMapNode | undefined {
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

/** Directed outgoing edges (generation order). */
export function getOutgoingEdges(map: DungeonMap, nodeId: string): DungeonMapEdge[] {
  return map.edges.filter((e) => e.fromNodeId === nodeId);
}

/** Bidirectional neighbors ignoring locks (for map display). */
export function getAdjacentNodeIds(map: DungeonMap, nodeId: string): string[] {
  const ids: string[] = [];
  for (const e of map.edges) {
    if (e.fromNodeId === nodeId) ids.push(e.toNodeId);
    else if (e.toNodeId === nodeId) ids.push(e.fromNodeId);
  }
  return ids;
}

export function isEdgeTraversable(edge: DungeonMapEdge, keysHeld: ExpeditionKey[] = []): boolean {
  if (!edge.locked) return true;
  if (!edge.requiredKeyId) return false;
  return keysHeld.some((k) => k.id === edge.requiredKeyId);
}

export function getReachableNodeIds(
  map: DungeonMap,
  startNodeId: string,
  keysHeld: ExpeditionKey[] = []
): Set<string> {
  const visited = new Set<string>();
  const queue = [startNodeId];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);
    for (const neighborId of getAdjacentNodeIds(map, nodeId)) {
      const edge = getEdgeBetween(map, nodeId, neighborId);
      if (edge && isEdgeTraversable(edge, keysHeld)) {
        queue.push(neighborId);
      }
    }
  }
  return visited;
}

/** Bidirectional neighbors the party can move to right now. */
export function getNeighborNodeIds(
  map: DungeonMap,
  nodeId: string,
  keysHeld: ExpeditionKey[] = []
): string[] {
  return getAdjacentNodeIds(map, nodeId).filter((neighborId) => {
    const edge = getEdgeBetween(map, nodeId, neighborId);
    return edge ? isEdgeTraversable(edge, keysHeld) : false;
  });
}

export function getEdgeBetween(
  map: DungeonMap,
  a: string,
  b: string
): DungeonMapEdge | undefined {
  return map.edges.find(
    (e) =>
      (e.fromNodeId === a && e.toNodeId === b) || (e.fromNodeId === b && e.toNodeId === a)
  );
}

/** Single outgoing edge convenience (legacy linear maps). */
export function getNextNodeId(
  map: DungeonMap,
  currentNodeId: string,
  keysHeld: ExpeditionKey[] = []
): string | null {
  const neighbors = getNeighborNodeIds(map, currentNodeId, keysHeld);
  if (neighbors.length === 1) return neighbors[0]!;
  const outgoing = getOutgoingEdges(map, currentNodeId);
  const unvisitedOut = outgoing.find((e) => {
    if (!isEdgeTraversable(e, keysHeld)) return false;
    const n = getNodeById(map, e.toNodeId);
    return n && n.visibility !== 'visited';
  });
  return unvisitedOut?.toNodeId ?? outgoing[0]?.toNodeId ?? neighbors[0] ?? null;
}

export function revealNeighbors(map: DungeonMap, nodeId: string): DungeonMapNode[] {
  const neighborIds = new Set(getAdjacentNodeIds(map, nodeId));
  return map.nodes.map((n) => {
    if (n.id === nodeId) return { ...n, visibility: 'visited' as const };
    if (neighborIds.has(n.id) && n.visibility === 'hidden') {
      return { ...n, visibility: 'revealed' as const };
    }
    return n;
  });
}

/**
 * Mark the previous room cleared, activate the destination, reveal its neighbors,
 * and keep `currentRoomIndex` / `currentNodeId` aligned.
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

  if (currentNodeId) {
    const edge = getEdgeBetween(map, currentNodeId, nextNodeId);
    if (!edge) throw new Error('Destination is not adjacent.');
    if (!isEdgeTraversable(edge, expedition.keysHeld ?? [])) {
      throw new Error('That corridor is locked.');
    }
  }

  const nextRoomIndex = rooms.findIndex((r) => r.id === nextNode.roomId);
  if (nextRoomIndex < 0) throw new Error('Next room not found for map node.');

  const currentRoomId = currentNodeId
    ? getNodeById(map, currentNodeId)?.roomId
    : rooms[expedition.currentRoomIndex]?.id;

  const nextRooms = rooms.map((r) => {
    if (currentRoomId && r.id === currentRoomId) {
      // Revisit: keep cleared if already cleared; otherwise mark cleared when leaving.
      if (r.status === 'cleared') return r;
      return { ...r, status: 'cleared' as const };
    }
    if (r.id === nextNode.roomId) {
      if (r.status === 'cleared') return r; // revisiting a cleared chamber
      return { ...r, status: 'active' as const };
    }
    return r;
  });

  let nextNodes = revealNeighbors(map, nextNodeId);
  if (currentNodeId) {
    nextNodes = nextNodes.map((n) =>
      n.id === currentNodeId ? { ...n, visibility: 'visited' as const } : n
    );
  }

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

function syncFogFromProgress(
  map: DungeonMap,
  rooms: DungeonRoom[],
  currentNodeId: string | undefined
): DungeonMapNode[] {
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const visitedIds = new Set<string>();
  for (const n of map.nodes) {
    const room = roomById.get(n.roomId);
    if (room && (room.status === 'cleared' || room.status === 'active')) {
      visitedIds.add(n.id);
    }
  }
  if (currentNodeId) visitedIds.add(currentNodeId);

  const revealedIds = new Set<string>();
  for (const id of visitedIds) {
    for (const nid of getAdjacentNodeIds(map, id)) {
      if (!visitedIds.has(nid)) revealedIds.add(nid);
    }
  }

  return map.nodes.map((n) => {
    if (visitedIds.has(n.id)) return { ...n, visibility: 'visited' as const };
    if (revealedIds.has(n.id)) return { ...n, visibility: 'revealed' as const };
    const fog: MapNodeVisibility = n.visibility === 'revealed' ? 'revealed' : 'hidden';
    return { ...n, visibility: fog };
  });
}

/** Upgrade a legacy expedition snapshot to include map + currentNodeId + MP. */
export function migrateExpeditionMap(exp: ExpeditionState): ExpeditionState {
  const dungeon = ensureDungeonMap(exp.dungeon);
  const map = dungeon.map;
  let currentNodeId = exp.currentNodeId;
  if (!currentNodeId && map) {
    currentNodeId = getNodeForRoomIndex(map, dungeon.rooms ?? [], exp.currentRoomIndex)?.id;
  }

  let syncedDungeon = dungeon;
  if (map) {
    const nextNodes = syncFogFromProgress(map, dungeon.rooms ?? [], currentNodeId);
    syncedDungeon = { ...dungeon, map: { ...map, nodes: nextNodes } };
  }

  const roomCount = dungeon.rooms?.length ?? dungeon.totalRooms ?? 8;
  const maxMp = exp.maxMovementPoints ?? defaultMovementBudget(roomCount);
  const mp = exp.movementPoints ?? maxMp;

  return {
    ...exp,
    dungeon: syncedDungeon,
    currentNodeId: currentNodeId ?? map?.startNodeId,
    movementPoints: mp,
    maxMovementPoints: maxMp,
    keysHeld: exp.keysHeld ?? [],
  };
}

/** Pick up a dungeon key from a room if not already held. */
export function grantRoomKey(
  expedition: ExpeditionState,
  room: DungeonRoom
): Pick<ExpeditionState, 'keysHeld' | 'logs'> | null {
  if (!room.keyGrant) return null;
  const held = expedition.keysHeld ?? [];
  if (held.some((k) => k.id === room.keyGrant!.id)) return null;
  const key = room.keyGrant;
  return {
    keysHeld: [...held, key],
    logs: [
      {
        id: generateId(),
        text: `🗝️ Found the ${key.name}! Locked corridors may now open.`,
        type: 'info',
        timestamp: Date.now(),
      },
    ],
  };
}

export function hasKey(expedition: ExpeditionState, keyId: string): boolean {
  return (expedition.keysHeld ?? []).some((k) => k.id === keyId);
}

export function countVisitedNodes(map: DungeonMap): number {
  return map.nodes.filter((n) => n.visibility === 'visited').length;
}

export function isEdgeVisible(map: DungeonMap, edge: DungeonMapEdge): boolean {
  const from = getNodeById(map, edge.fromNodeId);
  const to = getNodeById(map, edge.toNodeId);
  if (!from || !to) return false;
  return from.visibility !== 'hidden' || to.visibility !== 'hidden';
}

export function getMovementPoints(expedition: ExpeditionState): {
  current: number;
  max: number;
} {
  const roomCount = expedition.dungeon.rooms?.length ?? expedition.dungeon.totalRooms ?? 8;
  const max = expedition.maxMovementPoints ?? defaultMovementBudget(roomCount);
  const current = expedition.movementPoints ?? max;
  return { current, max };
}

export function restoreMovementPoints(
  expedition: ExpeditionState,
  amount: number = CAMPFIRE_MP_RESTORE
): Pick<ExpeditionState, 'movementPoints' | 'maxMovementPoints'> {
  const { current, max } = getMovementPoints(expedition);
  return {
    movementPoints: Math.min(max, current + amount),
    maxMovementPoints: max,
  };
}

export { MOVE_COST, CAMPFIRE_MP_RESTORE };
