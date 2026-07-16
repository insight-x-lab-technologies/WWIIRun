import { createCompoundHitbox, type CompoundHitbox } from "../collision";

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
export type EntitySlot = {
  active: boolean;
  definitionId: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
};
export type EntityPools = {
  readonly projectiles: EntitySlot[];
  readonly enemies: EntitySlot[];
  readonly coins: EntitySlot[];
  cursors: { projectile: number; enemy: number; coin: number };
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
export const ENEMY_PLACEHOLDER: EntityDefinition = Object.freeze({
  id: "enemy.placeholder.v1",
  kind: "enemy",
  pivot: Object.freeze({ x: 0, y: 0 }),
  hitboxes: createCompoundHitbox([
    { kind: "aabb", offsetX: 0, offsetY: 0, halfWidth: 2048, halfHeight: 1024 },
    { kind: "circle", offsetX: 1024, offsetY: 0, radius: 512 },
  ]),
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
  COIN_PLACEHOLDER,
];

export function createEntityPools(): EntityPools {
  return {
    projectiles: createSlots(MAX_PROJECTILES),
    enemies: createSlots(MAX_ENEMIES),
    coins: createSlots(MAX_COINS),
    cursors: { projectile: 0, enemy: 0, coin: 0 },
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
  const slots = slotsFor(pools, kind);
  const start = pools.cursors[kind];
  for (let offset = 0; offset < slots.length; offset += 1) {
    const index = (start + offset) % slots.length;
    const slot = slots[index]!;
    if (!slot.active) {
      slot.active = true;
      slot.definitionId = definitionId;
      slot.position.x = x;
      slot.position.y = y;
      slot.velocity.x = velocityX;
      slot.velocity.y = velocityY;
      pools.cursors[kind] = (index + 1) % slots.length;
      return { status: "spawned", id: `${kind}:${index}` };
    }
  }
  return { status: "exhausted" };
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
    });
  return slots;
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
