import type { RngStreamId } from "../random";
import type { RunState, StateHash, StateHashAlgorithm } from "./types";

export const STATE_HASH_ALGORITHM: StateHashAlgorithm = "fnv1a64-v1";

const LAYOUT_TAG = "wwiirun.run-state.v1";
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
  hasher.writeByte(state.input.moveX & 0xff);
  hasher.writeByte(state.input.moveY & 0xff);
  hasher.writeUint16(state.input.actions);
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

  return hasher.digest();
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
