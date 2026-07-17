import { createCompoundHitbox, type CompoundHitbox } from "../collision";
import { createStructurePools, type StructurePools } from "../structures";

export const MAX_PROJECTILES = 256 as const;
export const MAX_ENEMIES = 64 as const;
export const MAX_COINS = 128 as const;
export const SIMULATION_ENVELOPE = 16_000_000 as const;

export type EntityKind = "projectile" | "enemy" | "coin";
export type EntityDefinition = {
  readonly id: string;
  readonly kind: EntityKind;
  readonly pivot: { readonly x: number; readonly y: number };
  readonly hitboxes: CompoundHitbox;
};
export type EnemyBehavior = "" | "scout" | "interceptor";
export type EntitySlot = {
  active: boolean;
  definitionId: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  damage: number;
  health: { current: number; max: number };
  behavior: EnemyBehavior;
  contactDamage: number;
};
export type EntityPools = {
  readonly projectiles: EntitySlot[];
  readonly enemies: EntitySlot[];
  readonly coins: EntitySlot[];
  readonly structures: StructurePools["structures"];
  cursors: {
    projectile: number;
    enemy: number;
    coin: number;
    structure: number;
  };
};
export type SpawnResult =
  | { readonly status: "spawned"; readonly id: string }
  | { readonly status: "exhausted" };

export const PROJECTILE_PLACEHOLDER: EntityDefinition = Object.freeze({
  id: "projectile.placeholder.v1",
  kind: "projectile",
  pivot: Object.freeze({ x: 0, y: 0 }),
  hitboxes: createCompoundHitbox([
    { kind: "aabb", offsetX: 0, offsetY: 0, halfWidth: 512, halfHeight: 256 },
  ]),
});
export const MACHINE_GUN: Readonly<{
  id: "weapon.machine-gun.v1";
  cooldownTicks: 6;
  damage: 1;
  velocityX: 2048;
}> = Object.freeze({
  id: "weapon.machine-gun.v1",
  cooldownTicks: 6,
  damage: 1,
  velocityX: 2048,
});
export const ENEMY_PLACEHOLDER: EntityDefinition = Object.freeze({
  id: "enemy.placeholder.v1",
  kind: "enemy",
  pivot: Object.freeze({ x: 0, y: 0 }),
  hitboxes: createCompoundHitbox([
    { kind: "aabb", offsetX: 0, offsetY: 0, halfWidth: 2048, halfHeight: 1024 },
    { kind: "circle", offsetX: 1024, offsetY: 0, radius: 512 },
  ]),
});
export const SCOUT_ENEMY: EntityDefinition &
  Readonly<{
    health: 3;
    contactDamage: 10;
    velocityX: -512;
    behavior: "scout";
  }> = Object.freeze({
  id: "enemy.scout.v1",
  kind: "enemy",
  pivot: Object.freeze({ x: 0, y: 0 }),
  hitboxes: createCompoundHitbox([
    { kind: "aabb", offsetX: 0, offsetY: 0, halfWidth: 1536, halfHeight: 768 },
  ]),
  health: 3,
  contactDamage: 10,
  velocityX: -512,
  behavior: "scout",
});
export const INTERCEPTOR_ENEMY: EntityDefinition &
  Readonly<{
    health: 5;
    contactDamage: 15;
    velocityX: -640;
    behavior: "interceptor";
    verticalAcceleration: 128;
    verticalSpeedCap: 768;
  }> = Object.freeze({
  id: "enemy.interceptor.v1",
  kind: "enemy",
  pivot: Object.freeze({ x: 0, y: 0 }),
  hitboxes: createCompoundHitbox([
    { kind: "aabb", offsetX: 0, offsetY: 0, halfWidth: 1792, halfHeight: 640 },
    { kind: "circle", offsetX: 1024, offsetY: 0, radius: 384 },
  ]),
  health: 5,
  contactDamage: 15,
  velocityX: -640,
  behavior: "interceptor",
  verticalAcceleration: 128,
  verticalSpeedCap: 768,
});
export const COIN_PLACEHOLDER: EntityDefinition = Object.freeze({
  id: "coin.placeholder.v1",
  kind: "coin",
  pivot: Object.freeze({ x: 0, y: 0 }),
  hitboxes: createCompoundHitbox([
    { kind: "circle", offsetX: 0, offsetY: 0, radius: 512 },
  ]),
});
const DEFINITIONS: readonly EntityDefinition[] = [
  PROJECTILE_PLACEHOLDER,
  ENEMY_PLACEHOLDER,
  SCOUT_ENEMY,
  INTERCEPTOR_ENEMY,
  COIN_PLACEHOLDER,
];

export function createEntityPools(): EntityPools {
  const structurePools = createStructurePools();
  return {
    projectiles: createSlots(MAX_PROJECTILES),
    enemies: createSlots(MAX_ENEMIES),
    coins: createSlots(MAX_COINS),
    structures: structurePools.structures,
    cursors: {
      projectile: 0,
      enemy: 0,
      coin: 0,
      structure: structurePools.cursor,
    },
  };
}
export function definitionFor(id: string): EntityDefinition | undefined {
  for (const definition of DEFINITIONS)
    if (definition.id === id) return definition;
  return undefined;
}
export function activateEntity(
  pools: EntityPools,
  kind: EntityKind,
  definitionId: string,
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
): SpawnResult {
  const definition = definitionFor(definitionId);
  if (definition === undefined || definition.kind !== kind)
    throw new TypeError("definition must match entity kind.");
  validateInteger("x", x);
  validateInteger("y", y);
  validateInteger("velocityX", velocityX);
  validateInteger("velocityY", velocityY);
  validateEnvelope(x, y, definition);
  const index = activateSlot(
    pools,
    kind,
    definition,
    definitionId,
    x,
    y,
    velocityX,
    velocityY,
    1,
  );
  if (index >= 0) return { status: "spawned", id: `${kind}:${index}` };
  return { status: "exhausted" };
}
/** Allocation-free hot-path spawn for the deterministic primary weapon. */
export function tryActivateProjectile(
  pools: EntityPools,
  x: number,
  y: number,
  velocityX: number,
  damage: number,
): boolean {
  const index = activateSlot(
    pools,
    "projectile",
    PROJECTILE_PLACEHOLDER,
    PROJECTILE_PLACEHOLDER.id,
    x,
    y,
    velocityX,
    0,
    damage,
  );
  return index >= 0;
}
export function activateEnemy(
  pools: EntityPools,
  definitionId: "enemy.scout.v1" | "enemy.interceptor.v1",
  x: number,
  y: number,
): SpawnResult {
  const definition = definitionFor(definitionId);
  if (definition === undefined)
    throw new TypeError("enemy definition is required.");
  const enemy = combatEnemyDefinition(definition);
  if (enemy === undefined) throw new TypeError("enemy definition is required.");
  return activateEntity(pools, "enemy", definitionId, x, y, enemy.velocityX, 0);
}
export function applyEnemyDamage(
  pools: EntityPools,
  index: number,
  amount: number,
): "applied" | "destroyed" {
  if (!Number.isInteger(amount) || amount <= 0 || amount > SIMULATION_ENVELOPE)
    throw new RangeError(
      "damage must be a positive integer within the simulation envelope.",
    );
  const slot = pools.enemies[index];
  if (slot === undefined)
    throw new RangeError("slot index is outside pool capacity.");
  if (!slot.active) return "applied";
  slot.health.current = Math.max(0, slot.health.current - amount);
  if (slot.health.current === 0) {
    clearSlot(slot);
    return "destroyed";
  }
  return "applied";
}
export function stepEnemyBehaviors(pools: EntityPools, playerY: number): void {
  for (const slot of pools.enemies) {
    if (!slot.active) continue;
    if (slot.behavior !== "interceptor") continue;
    const desired = clamp(
      Math.trunc((playerY - slot.position.y) / 16),
      -768,
      768,
    );
    if (slot.velocity.y < desired)
      slot.velocity.y = Math.min(desired, slot.velocity.y + 128);
    else if (slot.velocity.y > desired)
      slot.velocity.y = Math.max(desired, slot.velocity.y - 128);
  }
}
export function deactivateEntity(
  pools: EntityPools,
  kind: EntityKind,
  index: number,
): void {
  const slots = slotsFor(pools, kind);
  if (!Number.isInteger(index) || index < 0 || index >= slots.length)
    throw new RangeError("slot index is outside pool capacity.");
  clearSlot(slots[index]!);
}
export function stepEntityPools(pools: EntityPools): void {
  forEachSlot(pools, (slot, definition) => {
    slot.position.x += slot.velocity.x;
    slot.position.y += slot.velocity.y;
    if (!withinEnvelope(slot.position.x, slot.position.y, definition))
      clearSlot(slot);
  });
}
export function forEachSlot(
  pools: EntityPools,
  callback: (
    slot: EntitySlot,
    definition: EntityDefinition,
    kind: EntityKind,
    index: number,
  ) => void,
): void {
  const kinds: readonly EntityKind[] = ["projectile", "enemy", "coin"];
  for (const kind of kinds) {
    const slots = slotsFor(pools, kind);
    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index]!;
      if (slot.active) {
        const definition = definitionFor(slot.definitionId);
        if (definition === undefined)
          throw new Error("active slot has unknown definition.");
        callback(slot, definition, kind, index);
      }
    }
  }
}
function createSlots(capacity: number): EntitySlot[] {
  const slots: EntitySlot[] = [];
  for (let index = 0; index < capacity; index += 1)
    slots.push({
      active: false,
      definitionId: "",
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      damage: 0,
      health: { current: 0, max: 0 },
      behavior: "",
      contactDamage: 0,
    });
  return slots;
}
function activateSlot(
  pools: EntityPools,
  kind: EntityKind,
  definition: EntityDefinition,
  definitionId: string,
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
  damage: number,
): number {
  const slots = slotsFor(pools, kind);
  const start = pools.cursors[kind];
  for (let offset = 0; offset < slots.length; offset += 1) {
    const index = (start + offset) % slots.length;
    const slot = slots[index]!;
    if (slot.active) continue;
    slot.active = true;
    slot.definitionId = definitionId;
    slot.position.x = x;
    slot.position.y = y;
    slot.velocity.x = velocityX;
    slot.velocity.y = velocityY;
    if (kind === "projectile") slot.damage = damage;
    if (kind === "enemy") {
      const enemy = combatEnemyDefinition(definition);
      slot.health.current = enemy?.health ?? 1;
      slot.health.max = enemy?.health ?? 1;
      slot.behavior = enemy?.behavior ?? "scout";
      slot.contactDamage = enemy?.contactDamage ?? 0;
    }
    pools.cursors[kind] = (index + 1) % slots.length;
    return index;
  }
  return -1;
}
function slotsFor(pools: EntityPools, kind: EntityKind): EntitySlot[] {
  return kind === "projectile"
    ? pools.projectiles
    : kind === "enemy"
      ? pools.enemies
      : pools.coins;
}
function clearSlot(slot: EntitySlot): void {
  slot.active = false;
  slot.definitionId = "";
  slot.position.x = 0;
  slot.position.y = 0;
  slot.velocity.x = 0;
  slot.velocity.y = 0;
  slot.damage = 0;
  slot.health.current = 0;
  slot.health.max = 0;
  slot.behavior = "";
  slot.contactDamage = 0;
}
function combatEnemyDefinition(
  definition: EntityDefinition,
): (typeof SCOUT_ENEMY | typeof INTERCEPTOR_ENEMY) | undefined {
  if (definition.id === SCOUT_ENEMY.id) return SCOUT_ENEMY;
  if (definition.id === INTERCEPTOR_ENEMY.id) return INTERCEPTOR_ENEMY;
  return undefined;
}
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
function validateInteger(name: string, value: number): void {
  if (!Number.isInteger(value) || Math.abs(value) > SIMULATION_ENVELOPE)
    throw new RangeError(
      `${name} must be an integer within the simulation envelope.`,
    );
}
function validateEnvelope(
  x: number,
  y: number,
  definition: EntityDefinition,
): void {
  if (!withinEnvelope(x, y, definition))
    throw new RangeError(
      "entity hitbox must remain within the simulation envelope.",
    );
}
function withinEnvelope(
  x: number,
  y: number,
  definition: EntityDefinition,
): boolean {
  for (const shape of definition.hitboxes) {
    const extentX = shape.kind === "aabb" ? shape.halfWidth : shape.radius;
    const extentY = shape.kind === "aabb" ? shape.halfHeight : shape.radius;
    if (
      Math.abs(x + shape.offsetX) + extentX > SIMULATION_ENVELOPE ||
      Math.abs(y + shape.offsetY) + extentY > SIMULATION_ENVELOPE
    )
      return false;
  }
  return true;
}
