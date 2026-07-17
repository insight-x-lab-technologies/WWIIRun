import { intersectsCompound, type CompoundHitbox } from "../collision";
import {
  definitionFor,
  MAX_COINS,
  MAX_ENEMIES,
  MAX_PROJECTILES,
  type EntityPools,
} from "../entities";
import {
  MAX_STRUCTURE_MODULES,
  MAX_STRUCTURES,
  structureDefinitionFor,
} from "../structures";

export const GRID_CELL_SIZE = 16_384 as const;
export const MAX_CELL_OCCUPANCIES_PER_ENTITY = 64 as const;
const MAX_OCCUPANCIES =
  (MAX_PROJECTILES +
    MAX_ENEMIES +
    MAX_COINS +
    1 +
    MAX_STRUCTURES * MAX_STRUCTURE_MODULES) *
  MAX_CELL_OCCUPANCIES_PER_ENTITY;
const STRUCTURE_MODULES = MAX_STRUCTURES * MAX_STRUCTURE_MODULES;
const PLAYER_ENEMY_END = MAX_ENEMIES;
const PLAYER_COIN_END = PLAYER_ENEMY_END + MAX_COINS;
const PLAYER_STRUCTURE_END = PLAYER_COIN_END + STRUCTURE_MODULES;
const PROJECTILE_ENEMY_END =
  PLAYER_STRUCTURE_END + MAX_PROJECTILES * MAX_ENEMIES;
const MAX_CANDIDATES =
  PROJECTILE_ENEMY_END + MAX_PROJECTILES * STRUCTURE_MODULES;
const PLAYER = 0,
  PROJECTILE = 1,
  ENEMY = 2,
  COIN = 3,
  STRUCTURE = 4;
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
  readonly occupiedModules: Uint8Array;
  readonly seen: Uint8Array;
  readonly playerStructureDamage: Uint8Array;
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
    occupiedModules: new Uint8Array(MAX_OCCUPANCIES),
    seen: new Uint8Array(MAX_CANDIDATES),
    playerStructureDamage: new Uint8Array(MAX_STRUCTURES),
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
  insert(player.position, playerHitboxes, PLAYER, 0, 0, scratch);
  scan(pools.projectiles, PROJECTILE, scratch);
  scan(pools.enemies, ENEMY, scratch);
  scan(pools.coins, COIN, scratch);
  for (
    let structureIndex = 0;
    structureIndex < pools.structures.length;
    structureIndex += 1
  ) {
    const structure = pools.structures[structureIndex]!;
    if (!structure.active) continue;
    const definition = structureDefinitionFor(structure.definitionId);
    if (!definition) throw new Error("active structure lacks definition");
    for (
      let moduleIndex = 0;
      moduleIndex < definition.modules.length;
      moduleIndex += 1
    ) {
      if (!structure.modules[moduleIndex]!.active) continue;
      const module = definition.modules[moduleIndex]!;
      scratch.metrics.activeEntities += 1;
      insert(
        {
          x: structure.position.x + module.offset.x,
          y: structure.position.y + module.offset.y,
        },
        module.hitboxes,
        STRUCTURE,
        structureIndex,
        moduleIndex,
        scratch,
      );
    }
  }
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
  if (code < PLAYER_ENEMY_END)
    return { first: "player:0", second: `enemy:${code}` };
  if (code < PLAYER_COIN_END)
    return { first: "player:0", second: `coin:${code - PLAYER_ENEMY_END}` };
  if (code < PLAYER_STRUCTURE_END)
    return { first: "player:0", second: structureId(code - PLAYER_COIN_END) };
  if (code < PROJECTILE_ENEMY_END) {
    const pair = code - PLAYER_STRUCTURE_END;
    return {
      first: `projectile:${Math.floor(pair / MAX_ENEMIES)}`,
      second: `enemy:${pair % MAX_ENEMIES}`,
    };
  }
  const pair = code - PROJECTILE_ENEMY_END;
  return {
    first: `projectile:${Math.floor(pair / STRUCTURE_MODULES)}`,
    second: structureId(pair % STRUCTURE_MODULES),
  };
}
function structureId(code: number): string {
  return `structure:${Math.floor(code / MAX_STRUCTURE_MODULES)}:module:${code % MAX_STRUCTURE_MODULES}`;
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
    if (!definition) throw new Error("active entity lacks definition");
    s.metrics.activeEntities += 1;
    insert(entity.position, definition.hitboxes, kind, slot, 0, s);
  }
}
function insert(
  position: { x: number; y: number },
  hitboxes: CompoundHitbox,
  kind: number,
  slot: number,
  module: number,
  s: BroadPhaseScratch,
): void {
  let minX = position.x,
    maxX = position.x,
    minY = position.y,
    maxY = position.y;
  for (const shape of hitboxes) {
    const ex = shape.kind === "aabb" ? shape.halfWidth : shape.radius,
      ey = shape.kind === "aabb" ? shape.halfHeight : shape.radius,
      x = position.x + shape.offsetX,
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
            s.occupiedModules[prior]!,
            kind,
            slot,
            module,
            s,
          );
      const next = s.occupancyCount++;
      s.occupiedCellsX[next] = x;
      s.occupiedCellsY[next] = y;
      s.occupiedKinds[next] = kind;
      s.occupiedSlots[next] = slot;
      s.occupiedModules[next] = module;
      s.metrics.occupancies += 1;
    }
}
function addAllowed(
  aKind: number,
  aSlot: number,
  _aModule: number,
  bKind: number,
  bSlot: number,
  bModule: number,
  s: BroadPhaseScratch,
): void {
  let code = -1;
  if (aKind === PLAYER && bKind === ENEMY) code = bSlot;
  else if (aKind === PLAYER && bKind === COIN) code = PLAYER_ENEMY_END + bSlot;
  else if (aKind === PLAYER && bKind === STRUCTURE)
    code = PLAYER_COIN_END + bSlot * MAX_STRUCTURE_MODULES + bModule;
  else if (aKind === PROJECTILE && bKind === ENEMY)
    code = PLAYER_STRUCTURE_END + aSlot * MAX_ENEMIES + bSlot;
  else if (aKind === PROJECTILE && bKind === STRUCTURE)
    code =
      PROJECTILE_ENEMY_END +
      aSlot * STRUCTURE_MODULES +
      bSlot * MAX_STRUCTURE_MODULES +
      bModule;
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
  if (code < PLAYER_ENEMY_END) {
    const slot = pools.enemies[code]!;
    right = slot.position;
    rightHitboxes = definitionFor(slot.definitionId)!.hitboxes;
  } else if (code < PLAYER_COIN_END) {
    const slot = pools.coins[code - PLAYER_ENEMY_END]!;
    right = slot.position;
    rightHitboxes = definitionFor(slot.definitionId)!.hitboxes;
  } else if (code < PLAYER_STRUCTURE_END) {
    const key = code - PLAYER_COIN_END,
      slot = pools.structures[Math.floor(key / MAX_STRUCTURE_MODULES)]!,
      module = structureDefinitionFor(slot.definitionId)!.modules[
        key % MAX_STRUCTURE_MODULES
      ]!;
    right = {
      x: slot.position.x + module.offset.x,
      y: slot.position.y + module.offset.y,
    };
    rightHitboxes = module.hitboxes;
  } else if (code < PROJECTILE_ENEMY_END) {
    const key = code - PLAYER_STRUCTURE_END,
      projectile = pools.projectiles[Math.floor(key / MAX_ENEMIES)]!,
      enemy = pools.enemies[key % MAX_ENEMIES]!;
    left = projectile.position;
    leftHitboxes = definitionFor(projectile.definitionId)!.hitboxes;
    right = enemy.position;
    rightHitboxes = definitionFor(enemy.definitionId)!.hitboxes;
  } else {
    const key = code - PROJECTILE_ENEMY_END,
      projectile = pools.projectiles[Math.floor(key / STRUCTURE_MODULES)]!,
      structure =
        pools.structures[
          Math.floor((key % STRUCTURE_MODULES) / MAX_STRUCTURE_MODULES)
        ]!,
      module = structureDefinitionFor(structure.definitionId)!.modules[
        key % MAX_STRUCTURE_MODULES
      ]!;
    left = projectile.position;
    leftHitboxes = definitionFor(projectile.definitionId)!.hitboxes;
    right = {
      x: structure.position.x + module.offset.x,
      y: structure.position.y + module.offset.y,
    };
    rightHitboxes = module.hitboxes;
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
  s.playerStructureDamage.fill(0);
  s.candidateCount = 0;
  s.contactCount = 0;
  s.occupancyCount = 0;
  s.metrics.activeEntities = 0;
  s.metrics.occupancies = 0;
  s.metrics.rawPairs = 0;
  s.metrics.uniquePairs = 0;
  s.metrics.primitiveComparisons = 0;
}
