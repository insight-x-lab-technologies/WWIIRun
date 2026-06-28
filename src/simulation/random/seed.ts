import type { RngState, Seed128, SeedParseResult } from "./types";

const SEED_HEX_LENGTH = 32;
const SEED_WORD_HEX_LENGTH = 8;
const SEED_HEX_PATTERN = /^[0-9a-fA-F]{32}$/;
const ZERO_SEED = "0".repeat(SEED_HEX_LENGTH);

export function parseSeedHex(input: string): SeedParseResult {
  if (input.length !== SEED_HEX_LENGTH) {
    return { ok: false, code: "invalid-length" };
  }
  if (!SEED_HEX_PATTERN.test(input)) {
    return { ok: false, code: "invalid-character" };
  }

  const canonicalSeed = input.toLowerCase();
  if (canonicalSeed === ZERO_SEED) {
    return { ok: false, code: "zero-seed" };
  }

  return { ok: true, value: canonicalSeed as Seed128 };
}

export function createRngState(seed: Seed128): RngState {
  return {
    algorithm: "xoshiro128ss-v1",
    s0: readSeedWord(seed, 0),
    s1: readSeedWord(seed, 1),
    s2: readSeedWord(seed, 2),
    s3: readSeedWord(seed, 3),
  };
}

function readSeedWord(seed: Seed128, index: number): number {
  const start = index * SEED_WORD_HEX_LENGTH;
  return (
    Number.parseInt(seed.slice(start, start + SEED_WORD_HEX_LENGTH), 16) >>> 0
  );
}
