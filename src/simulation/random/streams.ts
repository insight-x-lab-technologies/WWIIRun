import { createRngState } from "./seed";
import type { RngState, RngStreamId, Seed128 } from "./types";
import { cloneRngState, nextUint32 } from "./xoshiro128ss";

const JUMP = [0x8764000b, 0xf542d2d3, 0x6fa035c3, 0x77f2db5b] as const;

export function createRngStreams(seed: Seed128): Record<RngStreamId, RngState> {
  const current = createRngState(seed);
  const spawn = cloneRngState(current);
  jump(current);
  const loot = cloneRngState(current);
  jump(current);
  const weather = cloneRngState(current);
  jump(current);
  const patterns = cloneRngState(current);

  return { spawn, loot, weather, patterns };
}

function jump(state: RngState): void {
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  let s3 = 0;

  for (const jumpWord of JUMP) {
    for (let bit = 0; bit < 32; bit += 1) {
      if ((jumpWord & (1 << bit)) !== 0) {
        s0 = (s0 ^ state.s0) >>> 0;
        s1 = (s1 ^ state.s1) >>> 0;
        s2 = (s2 ^ state.s2) >>> 0;
        s3 = (s3 ^ state.s3) >>> 0;
      }
      nextUint32(state);
    }
  }

  state.s0 = s0;
  state.s1 = s1;
  state.s2 = s2;
  state.s3 = s3;
}
