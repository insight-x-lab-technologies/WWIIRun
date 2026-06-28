import { describe, expect, test } from "vitest";

import {
  cloneRngState,
  createRngState,
  createRngStreams,
  nextIntExclusive,
  nextUint32,
  parseSeedHex,
  type RngState,
} from "../../src/simulation/random";

const parseValidSeed = (input: string) => {
  const result = parseSeedHex(input);
  if (!result.ok) {
    throw new Error(`Expected a valid seed, received ${result.code}.`);
  }
  return result.value;
};

const snapshot = (state: RngState) => ({ ...state });

describe("parseSeedHex", () => {
  test.each([
    "0123456789abcdeffedcba9876543210",
    "0123456789ABCDEFFEDCBA9876543210",
  ])("canonicalizes valid seed %s", (input) => {
    expect(parseSeedHex(input)).toEqual({
      ok: true,
      value: "0123456789abcdeffedcba9876543210",
    });
  });

  test.each([
    ["", "invalid-length"],
    ["0123456789abcdeffedcba987654321", "invalid-length"],
    ["0123456789abcdeffedcba98765432100", "invalid-length"],
    [" 0123456789abcdeffedcba9876543210", "invalid-length"],
    ["0x0123456789abcdeffedcba9876543210", "invalid-length"],
    ["0123456789abcdeffedcba987654321g", "invalid-character"],
    ["0123456789abcdeffedcba987654321é", "invalid-character"],
    ["00000000000000000000000000000000", "zero-seed"],
  ] as const)("rejects %j with %s", (input, code) => {
    expect(parseSeedHex(input)).toEqual({ ok: false, code });
  });

  test("accepts the maximum 128-bit seed", () => {
    expect(parseSeedHex("ffffffffffffffffffffffffffffffff")).toEqual({
      ok: true,
      value: "ffffffffffffffffffffffffffffffff",
    });
  });
});

describe("xoshiro128ss-v1 state", () => {
  test("creates words in textual most-significant-first order", () => {
    const state = createRngState(
      parseValidSeed("0123456789abcdeffedcba9876543210"),
    );

    expect(state).toEqual({
      algorithm: "xoshiro128ss-v1",
      s0: 0x01234567,
      s1: 0x89abcdef,
      s2: 0xfedcba98,
      s3: 0x76543210,
    });
  });

  test("matches the first official-transition reference values", () => {
    const state = createRngState(
      parseValidSeed("0123456789abcdeffedcba9876543210"),
    );

    expect(Array.from({ length: 4 }, () => nextUint32(state))).toEqual([
      0x99998498, 0x6666695f, 0xcce4f862, 0xc6698edf,
    ]);
    expect(state).toEqual({
      algorithm: "xoshiro128ss-v1",
      s0: 0xbe1a14de,
      s1: 0xf04ae53a,
      s2: 0xd7c74e5d,
      s3: 0x75b49dbf,
    });
  });

  test("clones state without aliasing", () => {
    const original = createRngState(
      parseValidSeed("0123456789abcdeffedcba9876543210"),
    );
    const clone = cloneRngState(original);

    expect(clone).not.toBe(original);
    expect(nextUint32(original)).toBe(nextUint32(clone));
    const cloneBeforeExtraDraw = snapshot(clone);
    nextUint32(original);
    expect(clone).toEqual(cloneBeforeExtraDraw);
  });

  test("keeps every state word unsigned through a long sequence", () => {
    const state = createRngState(
      parseValidSeed("8000000000000001ffffffff7fffffff"),
    );
    let invalidValue: number | undefined;

    for (let index = 0; index < 10_000; index += 1) {
      const value = nextUint32(state);
      for (const word of [value, state.s0, state.s1, state.s2, state.s3]) {
        if (!Number.isInteger(word) || word < 0 || word > 0xffffffff) {
          invalidValue = word;
          break;
        }
      }
      if (invalidValue !== undefined) {
        break;
      }
    }

    expect(invalidValue).toBeUndefined();
  });
});

describe("createRngStreams", () => {
  test("creates four independent banks with stable jump indices", () => {
    const first = createRngStreams(
      parseValidSeed("0123456789abcdeffedcba9876543210"),
    );
    const second = createRngStreams(
      parseValidSeed("0123456789abcdeffedcba9876543210"),
    );

    expect(first).toEqual(second);
    expect(new Set(Object.values(first)).size).toBe(4);
    expect(first.spawn).toMatchObject({ s0: 0x01234567, s1: 0x89abcdef });
    expect(first.loot).toMatchObject({ s0: 0x6f0f5abd, s1: 0x040bd3df });
    const lootBeforeSpawnDraw = snapshot(first.loot);
    nextUint32(first.spawn);
    expect(first.loot).toEqual(lootBeforeSpawnDraw);
  });
});

describe("nextIntExclusive", () => {
  test.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 0x1_0000_0001])(
    "rejects invalid upper bound %s without advancing state",
    (upperExclusive) => {
      const state = createRngState(
        parseValidSeed("0123456789abcdeffedcba9876543210"),
      );
      const before = snapshot(state);

      expect(() => nextIntExclusive(state, upperExclusive)).toThrowError(
        new RangeError(
          "upperExclusive must be an integer between 1 and 4294967296.",
        ),
      );
      expect(state).toEqual(before);
    },
  );

  test.each([1, 2, 3, 10, 0x80000001, 0x1_0000_0000])(
    "returns values inside [0, %s)",
    (upperExclusive) => {
      const state = createRngState(
        parseValidSeed("0123456789abcdeffedcba9876543210"),
      );

      for (let index = 0; index < 100; index += 1) {
        const value = nextIntExclusive(state, upperExclusive);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(upperExclusive);
        expect(Number.isInteger(value)).toBe(true);
      }
    },
  );

  test("uses rejection sampling and consumes every rejected draw", () => {
    const state = createRngState(
      parseValidSeed("8000000000000001ffffffff7fffffff"),
    );

    expect(nextIntExclusive(state, 0x80000001)).toBe(0x7fffd536);
    expect(state).toEqual({
      algorithm: "xoshiro128ss-v1",
      s0: 0x7ffff3ff,
      s1: 0xfffffdff,
      s2: 0x7ffffe01,
      s3: 0x00600c00,
    });
  });
});
