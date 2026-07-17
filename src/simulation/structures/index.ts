import { createCompoundHitbox, type CompoundHitbox } from "../collision";
import { SIMULATION_ENVELOPE } from "../entities";

export const MAX_STRUCTURES = 16 as const;
export const MAX_STRUCTURE_MODULES = 4 as const;

export type StructureModuleDefinition = {
  readonly id: "left" | "core" | "right";
  readonly offset: { readonly x: number; readonly y: number };
  readonly hitboxes: CompoundHitbox;
  readonly health: 3;
  readonly contactDamage: 12;
};
export type StructureDefinition = {
  readonly id: "structure.modular-block.v1";
  readonly modules: readonly StructureModuleDefinition[];
};
export type StructureModuleSlot = {
  active: boolean;
  health: { current: number; max: number };
};
export type StructureSlot = {
  active: boolean;
  definitionId: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  readonly modules: StructureModuleSlot[];
};
export type StructurePools = {
  readonly structures: StructureSlot[];
  cursor: number;
};
export type StructurePoolPort = {
  readonly structures: StructureSlot[];
  cursors: { structure: number };
};
export type StructureSpawnResult =
  | { readonly status: "spawned"; readonly id: string }
  | { readonly status: "exhausted" };

const module = (
  id: StructureModuleDefinition["id"],
  x: number,
): StructureModuleDefinition =>
  Object.freeze({
    id,
    offset: Object.freeze({ x, y: 0 }),
    hitboxes: createCompoundHitbox([
      {
        kind: "aabb",
        offsetX: 0,
        offsetY: 0,
        halfWidth: 2048,
        halfHeight: 1536,
      },
    ]),
    health: 3,
    contactDamage: 12,
  });

export const MODULAR_BLOCK_STRUCTURE: StructureDefinition = Object.freeze({
  id: "structure.modular-block.v1",
  modules: Object.freeze([
    module("left", -4096),
    module("core", 0),
    module("right", 4096),
  ]),
});

export function createStructurePools(): StructurePools {
  const structures: StructureSlot[] = [];
  for (let index = 0; index < MAX_STRUCTURES; index += 1) {
    const modules: StructureModuleSlot[] = [];
    for (
      let moduleIndex = 0;
      moduleIndex < MAX_STRUCTURE_MODULES;
      moduleIndex += 1
    )
      modules.push({ active: false, health: { current: 0, max: 0 } });
    structures.push({
      active: false,
      definitionId: "",
      position: { x: 0, y: 0 },
      velocity: { x: 0, y: 0 },
      modules,
    });
  }
  return { structures, cursor: 0 };
}

export function structureDefinitionFor(
  id: string,
): StructureDefinition | undefined {
  return id === MODULAR_BLOCK_STRUCTURE.id
    ? MODULAR_BLOCK_STRUCTURE
    : undefined;
}

export function activateStructure(
  pools: StructurePoolPort,
  definitionId: string,
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
): StructureSpawnResult {
  const definition = structureDefinitionFor(definitionId);
  if (definition === undefined)
    throw new TypeError("structure definition is required.");
  validateInteger(x);
  validateInteger(y);
  validateInteger(velocityX);
  validateInteger(velocityY);
  validateEnvelope(x, y, definition);
  for (let offset = 0; offset < pools.structures.length; offset += 1) {
    const index = (pools.cursors.structure + offset) % pools.structures.length;
    const slot = pools.structures[index]!;
    if (slot.active) continue;
    slot.active = true;
    slot.definitionId = definition.id;
    slot.position.x = x;
    slot.position.y = y;
    slot.velocity.x = velocityX;
    slot.velocity.y = velocityY;
    for (
      let moduleIndex = 0;
      moduleIndex < definition.modules.length;
      moduleIndex += 1
    ) {
      const target = slot.modules[moduleIndex]!;
      target.active = true;
      target.health.current = definition.modules[moduleIndex]!.health;
      target.health.max = definition.modules[moduleIndex]!.health;
    }
    pools.cursors.structure = (index + 1) % pools.structures.length;
    return { status: "spawned", id: `structure:${index}` };
  }
  return { status: "exhausted" };
}

export function applyStructureModuleDamage(
  pools: Pick<StructurePoolPort, "structures">,
  structureIndex: number,
  moduleIndex: number,
  amount: number,
): "applied" | "destroyed" {
  if (!Number.isInteger(amount) || amount <= 0 || amount > SIMULATION_ENVELOPE)
    throw new RangeError(
      "damage must be a positive integer within the simulation envelope.",
    );
  const slot = pools.structures[structureIndex];
  if (
    slot === undefined ||
    moduleIndex < 0 ||
    moduleIndex >= MAX_STRUCTURE_MODULES
  )
    throw new RangeError("structure module index is outside pool capacity.");
  const module = slot.modules[moduleIndex]!;
  if (!slot.active || !module.active) return "applied";
  module.health.current = Math.max(0, module.health.current - amount);
  if (module.health.current !== 0) return "applied";
  module.active = false;
  module.health.max = 0;
  for (const remaining of slot.modules)
    if (remaining.active) return "destroyed";
  clearStructure(slot);
  return "destroyed";
}

export function stepStructures(
  pools: Pick<StructurePoolPort, "structures">,
): void {
  for (const slot of pools.structures) {
    if (!slot.active) continue;
    slot.position.x += slot.velocity.x;
    slot.position.y += slot.velocity.y;
    const definition = structureDefinitionFor(slot.definitionId);
    if (
      definition === undefined ||
      !withinEnvelope(slot.position.x, slot.position.y, definition)
    )
      clearStructure(slot);
  }
}

export function clearStructure(slot: StructureSlot): void {
  slot.active = false;
  slot.definitionId = "";
  slot.position.x = 0;
  slot.position.y = 0;
  slot.velocity.x = 0;
  slot.velocity.y = 0;
  for (const module of slot.modules) {
    module.active = false;
    module.health.current = 0;
    module.health.max = 0;
  }
}

function validateInteger(value: number): void {
  if (!Number.isInteger(value) || Math.abs(value) > SIMULATION_ENVELOPE)
    throw new RangeError(
      "structure values must be integers within the simulation envelope.",
    );
}
function validateEnvelope(
  x: number,
  y: number,
  definition: StructureDefinition,
): void {
  if (!withinEnvelope(x, y, definition))
    throw new RangeError(
      "structure hitbox must remain within the simulation envelope.",
    );
}
function withinEnvelope(
  x: number,
  y: number,
  definition: StructureDefinition,
): boolean {
  for (const module of definition.modules)
    for (const shape of module.hitboxes) {
      const extentX = shape.kind === "aabb" ? shape.halfWidth : shape.radius;
      const extentY = shape.kind === "aabb" ? shape.halfHeight : shape.radius;
      if (
        Math.abs(x + module.offset.x + shape.offsetX) + extentX >
          SIMULATION_ENVELOPE ||
        Math.abs(y + module.offset.y + shape.offsetY) + extentY >
          SIMULATION_ENVELOPE
      )
        return false;
    }
  return true;
}
