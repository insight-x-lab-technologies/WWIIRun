import { intersectsCompound, type CompoundHitbox } from "../collision";
import { definitionFor, type EntityPools } from "../entities";

export const GRID_CELL_SIZE = 16_384 as const;
export const MAX_CELL_OCCUPANCIES_PER_ENTITY = 64 as const;
const MAX_OCCUPANCIES = (256 + 64 + 128 + 1) * MAX_CELL_OCCUPANCIES_PER_ENTITY;
const MAX_CANDIDATES = 64 + 128 + 256 * 64;
const PLAYER = 0,
  PROJECTILE = 1,
  ENEMY = 2,
  COIN = 3;
export type CandidatePair = { first: string; second: string };
export type BroadPhaseMetrics = {
  activeEntities: number;
  occupancies: number;
  rawPairs: number;
  uniquePairs: number;
  primitiveComparisons: number;
};
export type BroadPhaseScratch = {
  readonly candidateCodes: Int32Array;
  readonly contactCodes: Int32Array;
  readonly occupiedCellsX: Int32Array;
  readonly occupiedCellsY: Int32Array;
  readonly occupiedKinds: Uint8Array;
  readonly occupiedSlots: Uint16Array;
  readonly seen: Uint8Array;
  candidateCount: number;
  contactCount: number;
  occupancyCount: number;
  readonly metrics: BroadPhaseMetrics;
  readonly narrowMetrics: { primitiveComparisons: number };
};

export function createBroadPhaseScratch(): BroadPhaseScratch {
  return {
    candidateCodes: new Int32Array(MAX_CANDIDATES),
    contactCodes: new Int32Array(MAX_CANDIDATES),
    occupiedCellsX: new Int32Array(MAX_OCCUPANCIES),
    occupiedCellsY: new Int32Array(MAX_OCCUPANCIES),
    occupiedKinds: new Uint8Array(MAX_OCCUPANCIES),
    occupiedSlots: new Uint16Array(MAX_OCCUPANCIES),
    seen: new Uint8Array(MAX_CANDIDATES),
    candidateCount: 0,
    contactCount: 0,
    occupancyCount: 0,
    metrics: {
      activeEntities: 0,
      occupancies: 0,
      rawPairs: 0,
      uniquePairs: 0,
      primitiveComparisons: 0,
    },
    narrowMetrics: { primitiveComparisons: 0 },
  };
}

export function collectContacts(
  pools: EntityPools,
  player: { position: { x: number; y: number } },
  playerHitboxes: CompoundHitbox,
  scratch: BroadPhaseScratch,
): BroadPhaseScratch {
  reset(scratch);
  insert(player.position, playerHitboxes, PLAYER, 0, scratch);
  scan(pools.projectiles, PROJECTILE, scratch);
  scan(pools.enemies, ENEMY, scratch);
  scan(pools.coins, COIN, scratch);
  for (let index = 0; index < scratch.candidateCount; index += 1)
    narrow(
      scratch.candidateCodes[index]!,
      pools,
      player,
      playerHitboxes,
      scratch,
    );
  return scratch;
}
export function candidateAt(
  s: BroadPhaseScratch,
  index: number,
): CandidatePair | undefined {
  if (!Number.isInteger(index) || index < 0 || index >= s.candidateCount)
    return undefined;
  const code = s.candidateCodes[index]!;
  if (code < 64) return { first: "player:0", second: `enemy:${code}` };
  if (code < 192) return { first: "player:0", second: `coin:${code - 64}` };
  const pair = code - 192;
  return {
    first: `projectile:${Math.floor(pair / 64)}`,
    second: `enemy:${pair % 64}`,
  };
}
function scan(
  slots: EntityPools["enemies"],
  kind: number,
  s: BroadPhaseScratch,
): void {
  for (let slot = 0; slot < slots.length; slot += 1) {
    const entity = slots[slot]!;
    if (!entity.active) continue;
    const definition = definitionFor(entity.definitionId);
    if (definition === undefined)
      throw new Error("active entity lacks definition");
    s.metrics.activeEntities += 1;
    insert(entity.position, definition.hitboxes, kind, slot, s);
  }
}
function insert(
  position: { x: number; y: number },
  hitboxes: CompoundHitbox,
  kind: number,
  slot: number,
  s: BroadPhaseScratch,
): void {
  let minX = position.x,
    maxX = position.x,
    minY = position.y,
    maxY = position.y;
  for (const shape of hitboxes) {
    const ex = shape.kind === "aabb" ? shape.halfWidth : shape.radius,
      ey = shape.kind === "aabb" ? shape.halfHeight : shape.radius;
    const x = position.x + shape.offsetX,
      y = position.y + shape.offsetY;
    if (x - ex < minX) minX = x - ex;
    if (x + ex > maxX) maxX = x + ex;
    if (y - ey < minY) minY = y - ey;
    if (y + ey > maxY) maxY = y + ey;
  }
  const sx = Math.floor(minX / GRID_CELL_SIZE),
    ex = Math.floor(maxX / GRID_CELL_SIZE),
    sy = Math.floor(minY / GRID_CELL_SIZE),
    ey = Math.floor(maxY / GRID_CELL_SIZE);
  if ((ex - sx + 1) * (ey - sy + 1) > MAX_CELL_OCCUPANCIES_PER_ENTITY)
    throw new RangeError("grid occupancy cap exceeded");
  for (let x = sx; x <= ex; x += 1)
    for (let y = sy; y <= ey; y += 1) {
      for (let prior = 0; prior < s.occupancyCount; prior += 1)
        if (s.occupiedCellsX[prior] === x && s.occupiedCellsY[prior] === y)
          addAllowed(
            s.occupiedKinds[prior]!,
            s.occupiedSlots[prior]!,
            kind,
            slot,
            s,
          );
      const next = s.occupancyCount++;
      s.occupiedCellsX[next] = x;
      s.occupiedCellsY[next] = y;
      s.occupiedKinds[next] = kind;
      s.occupiedSlots[next] = slot;
      s.metrics.occupancies += 1;
    }
}
function addAllowed(
  aKind: number,
  aSlot: number,
  bKind: number,
  bSlot: number,
  s: BroadPhaseScratch,
): void {
  let code = -1;
  if (aKind === PLAYER && bKind === ENEMY) code = bSlot;
  else if (aKind === PLAYER && bKind === COIN) code = 64 + bSlot;
  else if (aKind === PROJECTILE && bKind === ENEMY)
    code = 192 + aSlot * 64 + bSlot;
  if (code < 0) return;
  s.metrics.rawPairs += 1;
  if (s.seen[code] === 1) return;
  s.seen[code] = 1;
  let index = s.candidateCount++;
  while (index > 0 && s.candidateCodes[index - 1]! > code) {
    s.candidateCodes[index] = s.candidateCodes[index - 1]!;
    index -= 1;
  }
  s.candidateCodes[index] = code;
  s.metrics.uniquePairs += 1;
}
function narrow(
  code: number,
  pools: EntityPools,
  player: { position: { x: number; y: number } },
  playerHitboxes: CompoundHitbox,
  s: BroadPhaseScratch,
): void {
  let left = player.position,
    leftHitboxes = playerHitboxes,
    right = player.position,
    rightHitboxes = playerHitboxes;
  if (code < 64) {
    const slot = pools.enemies[code]!;
    const definition = definitionFor(slot.definitionId)!;
    right = slot.position;
    rightHitboxes = definition.hitboxes;
  } else if (code < 192) {
    const slot = pools.coins[code - 64]!;
    const definition = definitionFor(slot.definitionId)!;
    right = slot.position;
    rightHitboxes = definition.hitboxes;
  } else {
    const pair = code - 192,
      projectile = pools.projectiles[Math.floor(pair / 64)]!,
      enemy = pools.enemies[pair % 64]!;
    left = projectile.position;
    leftHitboxes = definitionFor(projectile.definitionId)!.hitboxes;
    right = enemy.position;
    rightHitboxes = definitionFor(enemy.definitionId)!.hitboxes;
  }
  s.narrowMetrics.primitiveComparisons = 0;
  if (
    intersectsCompound(
      left,
      leftHitboxes,
      right,
      rightHitboxes,
      s.narrowMetrics,
    )
  )
    s.contactCodes[s.contactCount++] = code;
  s.metrics.primitiveComparisons += s.narrowMetrics.primitiveComparisons;
}
function reset(s: BroadPhaseScratch): void {
  s.seen.fill(0);
  s.candidateCount = 0;
  s.contactCount = 0;
  s.occupancyCount = 0;
  s.metrics.activeEntities = 0;
  s.metrics.occupancies = 0;
  s.metrics.rawPairs = 0;
  s.metrics.uniquePairs = 0;
  s.metrics.primitiveComparisons = 0;
}
