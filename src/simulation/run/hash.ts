import type { RngStreamId } from "../random";
import type { RunState, StateHash, StateHashAlgorithm } from "./types";

export const STATE_HASH_ALGORITHM: StateHashAlgorithm = "fnv1a64-v1";

const LAYOUT_TAG = "wwiirun.run-state.v5";
const FNV_OFFSET_BASIS = 0xcbf29ce484222325n;
const FNV_PRIME = 0x00000100000001b3n;
const UINT64_MASK = 0xffffffffffffffffn;
const STREAM_IDS: readonly RngStreamId[] = [
  "spawn",
  "loot",
  "weather",
  "patterns",
];

export function hashRunState(state: RunState): StateHash {
  const hasher = createFnv1a64Writer();

  hasher.writeAscii(LAYOUT_TAG);
  hasher.writeUint32(state.schemaVersion);
  hasher.writeAscii(state.config.mode);
  hasher.writeAscii(state.config.seed);
  hasher.writeAscii(state.config.rulesetVersion);
  hasher.writeAscii(state.config.contentVersion);
  hasher.writeAscii(state.config.aircraftId);
  hasher.writeAscii(state.config.loadoutId);
  hasher.writeUint32(state.config.modifierIds.length);
  for (const modifierId of state.config.modifierIds) {
    hasher.writeAscii(modifierId);
  }
  hasher.writeUint32(state.tick);
  hasher.writeUint32(state.primaryCooldownTicks);
  hasher.writeByte(state.input.moveX & 0xff);
  hasher.writeByte(state.input.moveY & 0xff);
  hasher.writeUint16(state.input.actions);
  hasher.writeAscii(state.player.definitionId);
  hasher.writeUint32(state.player.position.x);
  hasher.writeUint32(state.player.position.y);
  hasher.writeUint32(state.player.velocity.x);
  hasher.writeUint32(state.player.velocity.y);
  hasher.writeUint32(state.player.health.current);
  hasher.writeUint32(state.player.health.max);
  hasher.writeUint32(state.player.invulnerabilityTicks);
  hasher.writeAscii(state.player.status);
  hasher.writeUint32(STREAM_IDS.length);
  for (const streamId of STREAM_IDS) {
    const rng = state.rng[streamId];
    hasher.writeAscii(streamId);
    hasher.writeAscii(rng.algorithm);
    hasher.writeUint32(rng.s0);
    hasher.writeUint32(rng.s1);
    hasher.writeUint32(rng.s2);
    hasher.writeUint32(rng.s3);
  }
  writePool(
    hasher,
    "projectile",
    state.pools.projectiles,
    state.pools.cursors.projectile,
  );
  writePool(hasher, "enemy", state.pools.enemies, state.pools.cursors.enemy);
  writePool(hasher, "coin", state.pools.coins, state.pools.cursors.coin);
  hasher.writeAscii("structure");
  hasher.writeUint32(state.pools.structures.length);
  hasher.writeUint32(state.pools.cursors.structure);
  for (const slot of state.pools.structures) {
    hasher.writeByte(slot.active ? 1 : 0);
    hasher.writeAscii(slot.definitionId);
    hasher.writeUint32(slot.position.x);
    hasher.writeUint32(slot.position.y);
    hasher.writeUint32(slot.velocity.x);
    hasher.writeUint32(slot.velocity.y);
    hasher.writeUint32(slot.modules.length);
    for (const module of slot.modules) {
      hasher.writeByte(module.active ? 1 : 0);
      hasher.writeUint32(module.health.current);
      hasher.writeUint32(module.health.max);
    }
  }

  return hasher.digest();
}

function writePool(
  hasher: FnvWriter,
  kind: string,
  slots: readonly {
    active: boolean;
    definitionId: string;
    position: { x: number; y: number };
    velocity: { x: number; y: number };
    damage: number;
    health: { current: number; max: number };
    behavior: string;
    contactDamage: number;
  }[],
  cursor: number,
): void {
  hasher.writeAscii(kind);
  hasher.writeUint32(slots.length);
  hasher.writeUint32(cursor);
  for (const slot of slots) {
    hasher.writeByte(slot.active ? 1 : 0);
    hasher.writeAscii(slot.definitionId);
    hasher.writeUint32(slot.position.x);
    hasher.writeUint32(slot.position.y);
    hasher.writeUint32(slot.velocity.x);
    hasher.writeUint32(slot.velocity.y);
    hasher.writeUint32(slot.damage);
    hasher.writeUint32(slot.health.current);
    hasher.writeUint32(slot.health.max);
    hasher.writeAscii(slot.behavior);
    hasher.writeUint32(slot.contactDamage);
  }
}

type FnvWriter = {
  writeByte(value: number): void;
  writeUint16(value: number): void;
  writeUint32(value: number): void;
  writeAscii(value: string): void;
  digest(): StateHash;
};

function createFnv1a64Writer(): FnvWriter {
  let hash = FNV_OFFSET_BASIS;

  const writeByte = (value: number): void => {
    hash ^= BigInt(value & 0xff);
    hash = (hash * FNV_PRIME) & UINT64_MASK;
  };

  const writeUint16 = (value: number): void => {
    writeByte(value);
    writeByte(value >>> 8);
  };

  const writeUint32 = (value: number): void => {
    writeByte(value);
    writeByte(value >>> 8);
    writeByte(value >>> 16);
    writeByte(value >>> 24);
  };

  const writeAscii = (value: string): void => {
    writeUint32(value.length);
    for (let index = 0; index < value.length; index += 1) {
      writeByte(value.charCodeAt(index));
    }
  };

  return {
    writeByte,
    writeUint16,
    writeUint32,
    writeAscii,
    digest: () => hash.toString(16).padStart(16, "0") as StateHash,
  };
}
