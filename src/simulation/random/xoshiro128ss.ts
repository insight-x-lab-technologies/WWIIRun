import type { RngState } from "./types";

const UINT32_RANGE = 0x1_0000_0000;
const BOUNDED_INTEGER_ERROR =
  "upperExclusive must be an integer between 1 and 4294967296.";

export function cloneRngState(state: RngState): RngState {
  return {
    algorithm: state.algorithm,
    s0: state.s0,
    s1: state.s1,
    s2: state.s2,
    s3: state.s3,
  };
}

export function nextUint32(state: RngState): number {
  const result =
    Math.imul(rotateLeft(Math.imul(state.s1, 5) >>> 0, 7), 9) >>> 0;
  const shifted = (state.s1 << 9) >>> 0;

  state.s2 = (state.s2 ^ state.s0) >>> 0;
  state.s3 = (state.s3 ^ state.s1) >>> 0;
  state.s1 = (state.s1 ^ state.s2) >>> 0;
  state.s0 = (state.s0 ^ state.s3) >>> 0;
  state.s2 = (state.s2 ^ shifted) >>> 0;
  state.s3 = rotateLeft(state.s3, 11);

  return result;
}

export function nextIntExclusive(
  state: RngState,
  upperExclusive: number,
): number {
  if (
    !Number.isInteger(upperExclusive) ||
    upperExclusive < 1 ||
    upperExclusive > UINT32_RANGE
  ) {
    throw new RangeError(BOUNDED_INTEGER_ERROR);
  }

  if (upperExclusive === UINT32_RANGE) {
    return nextUint32(state);
  }

  const threshold = (UINT32_RANGE - upperExclusive) % upperExclusive;
  let value = nextUint32(state);
  while (value < threshold) {
    value = nextUint32(state);
  }
  return value % upperExclusive;
}

function rotateLeft(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0;
}
