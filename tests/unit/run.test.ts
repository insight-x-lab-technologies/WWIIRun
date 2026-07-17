import { describe, expect, test } from "vitest";

import { parseSeedHex } from "../../src/simulation/random";
import {
  InputActionBits,
  RUN_STATE_SCHEMA_VERSION,
  STATE_HASH_ALGORITHM,
  TICKS_PER_SECOND,
  advanceRun,
  createRunState,
  hashRunState,
  stepRun,
  type InputFrame,
  type RunConfig,
  type RunState,
} from "../../src/simulation/run";

function validConfig(overrides: Partial<RunConfig> = {}): RunConfig {
  const parsed = parseSeedHex("0123456789abcdeffedcba9876543210");
  if (!parsed.ok) throw new Error("Test seed must be valid.");

  return {
    mode: "daily",
    seed: parsed.value,
    rulesetVersion: "rules.v1",
    contentVersion: "content.v1",
    aircraftId: "aircraft.p51d.v1",
    loadoutId: "loadout.daily.v1",
    modifierIds: ["weather.snow.v1", "difficulty.hard.v1"],
    ...overrides,
  };
}

describe("createRunState", () => {
  test.each(["endless", "daily", "weekly"] as const)(
    "accepts run mode %s",
    (mode) => {
      expect(createRunState(validConfig({ mode })).config.mode).toBe(mode);
    },
  );

  test("creates the canonical initial run state", () => {
    const modifierIds = ["weather.snow.v1", "difficulty.hard.v1"];
    const config = validConfig({ modifierIds });

    const state = createRunState(config);

    expect(TICKS_PER_SECOND).toBe(60);
    expect(RUN_STATE_SCHEMA_VERSION).toBe(6);
    expect(InputActionBits).toEqual({
      firePrimary: 0x0001,
      fireSecondary: 0x0002,
      special: 0x0004,
    });
    expect(state).toMatchObject({
      schemaVersion: 6,
      config: {
        ...config,
        modifierIds: ["difficulty.hard.v1", "weather.snow.v1"],
      },
      tick: 0,
      primaryCooldownTicks: 0,
      input: { moveX: 0, moveY: 0, actions: 0 },
      player: {
        definitionId: "aircraft.placeholder.v1",
        position: { x: 40960, y: 69120 },
        velocity: { x: 0, y: 0 },
        health: { current: 100, max: 100 },
        invulnerabilityTicks: 0,
        status: "active",
      },
      rng: {
        spawn: {
          algorithm: "xoshiro128ss-v1",
          s0: 0x01234567,
          s1: 0x89abcdef,
          s2: 0xfedcba98,
          s3: 0x76543210,
        },
        loot: {
          algorithm: "xoshiro128ss-v1",
          s0: 0x6f0f5abd,
          s1: 0x040bd3df,
          s2: 0xeb8223e2,
          s3: 0x591ba81e,
        },
        weather: {
          algorithm: "xoshiro128ss-v1",
          s0: 0xb7f5448f,
          s1: 0x24b8fffc,
          s2: 0x35a27caa,
          s3: 0x46a2ed6d,
        },
        patterns: {
          algorithm: "xoshiro128ss-v1",
          s0: 0x0443e407,
          s1: 0xac6ba17c,
          s2: 0xef28acdc,
          s3: 0x1fbfc1b0,
        },
      },
    });
    expect(state.pools.projectiles).toHaveLength(256);
    expect(state.pools.enemies).toHaveLength(64);
    expect(state.pools.coins).toHaveLength(128);
    expect(state.pools.cursors).toEqual({
      projectile: 0,
      enemy: 0,
      coin: 0,
      structure: 0,
    });
    expect(state.config).not.toBe(config);
    expect(state.config.modifierIds).not.toBe(modifierIds);
    expect(Object.isFrozen(state.config)).toBe(true);
    expect(Object.isFrozen(state.config.modifierIds)).toBe(true);

    modifierIds[0] = "mutated";
    expect(state.config.modifierIds).toEqual([
      "difficulty.hard.v1",
      "weather.snow.v1",
    ]);
  });

  test.each([
    ["mode", { mode: "arcade" }],
    ["seed", { seed: "0123456789ABCDEFFEDCBA9876543210" }],
    ["seed", { seed: "not-a-seed" }],
    ["seed", { seed: 123 }],
    ["rulesetVersion", { rulesetVersion: "" }],
    ["contentVersion", { contentVersion: "contains space" }],
    ["aircraftId", { aircraftId: "avião.v1" }],
    ["loadoutId", { loadoutId: `a${"b".repeat(64)}` }],
    ["modifierIds[1]", { modifierIds: ["modifier.ok", "NOT-CANONICAL"] }],
    ["modifierIds", { modifierIds: ["duplicate", "duplicate"] }],
    [
      "modifierIds",
      { modifierIds: Array.from({ length: 33 }, (_, index) => `mod.${index}`) },
    ],
    ["modifierIds", { modifierIds: "not-an-array" }],
  ] as const)("rejects invalid config field %s", (field, overrides) => {
    const config = {
      ...validConfig(),
      ...overrides,
    } as unknown as RunConfig;

    expect(() => createRunState(config)).toThrowError(TypeError);
    expect(() => createRunState(config)).toThrowError(field);
  });

  test("does not retain extra noncompetitive config metadata", () => {
    const config = {
      ...validConfig(),
      locale: "pt-BR",
      timezone: "America/Sao_Paulo",
      cosmeticPackId: "pack.cosmetic.v1",
    } as unknown as RunConfig & Record<string, string>;

    const state = createRunState(config);

    expect(state.config).not.toHaveProperty("locale");
    expect(state.config).not.toHaveProperty("timezone");
    expect(state.config).not.toHaveProperty("cosmeticPackId");
  });

  test("accepts the token and modifier count limits", () => {
    const modifierIds = Array.from(
      { length: 32 },
      (_, index) => `modifier.${index.toString().padStart(2, "0")}`,
    );
    const token = `a${"b".repeat(63)}`;

    const state = createRunState(
      validConfig({
        rulesetVersion: token,
        contentVersion: token,
        aircraftId: token,
        loadoutId: token,
        modifierIds,
      }),
    );

    expect(state.config.rulesetVersion).toHaveLength(64);
    expect(state.config.modifierIds).toHaveLength(32);
  });

  test("copies the config object instead of retaining mutable fields", () => {
    const config = validConfig() as RunConfig & { rulesetVersion: string };
    const state = createRunState(config);

    config.rulesetVersion = "rules.mutated";

    expect(state.config.rulesetVersion).toBe("rules.v1");
  });

  test("creates runs with independent mutable state", () => {
    const first = createRunState(validConfig());
    const second = createRunState(validConfig());

    first.rng.spawn.s0 = 0;
    first.input = { moveX: 1, moveY: 2, actions: 3 };

    expect(first.rng.spawn).not.toBe(second.rng.spawn);
    expect(second.rng.spawn.s0).toBe(0x01234567);
    expect(second.input).toEqual({ moveX: 0, moveY: 0, actions: 0 });
  });
});

describe("fixed-tick transition", () => {
  test.each([-127, 0, 127])("accepts moveX boundary %s", (moveX) => {
    const state = createRunState(validConfig());
    const input = { moveX, moveY: 0, actions: 0 };

    stepRun(state, input);

    expect(state.tick).toBe(1);
    expect(state.input).toEqual(input);
    expect(state.input).not.toBe(input);
  });

  test("reuses state input storage across ticks", () => {
    const state = createRunState(validConfig());
    const storage = state.input;

    stepRun(state, { moveX: 1, moveY: 2, actions: 1 });
    stepRun(state, { moveX: 3, moveY: 4, actions: 2 });

    expect(state.input).toBe(storage);
    expect(state.input).toEqual({ moveX: 3, moveY: 4, actions: 2 });
  });

  test("steps the canonical aircraft before incrementing the tick", () => {
    const state = createRunState(validConfig());
    stepRun(state, { moveX: 127, moveY: -127, actions: 0 });
    expect(state.player.position).toEqual({ x: 41056, y: 69024 });
    expect(state.player.velocity).toEqual({ x: 96, y: -96 });
    expect(state.tick).toBe(1);
  });

  test.each([-127, 0, 127])("accepts moveY boundary %s", (moveY) => {
    const state = createRunState(validConfig());
    stepRun(state, { moveX: 0, moveY, actions: 0 });
    expect(state.input.moveY).toBe(moveY);
  });

  test.each([0, 1, 2, 3, 4, 5, 6, 7])(
    "accepts action combination %s",
    (actions) => {
      const state = createRunState(validConfig());
      stepRun(state, { moveX: 0, moveY: 0, actions });
      expect(state.input.actions).toBe(actions);
    },
  );

  test.each([
    ["moveX", { moveX: -128, moveY: 0, actions: 0 }],
    ["moveX", { moveX: 1.5, moveY: 0, actions: 0 }],
    ["moveX", { moveX: Number.NaN, moveY: 0, actions: 0 }],
    ["moveY", { moveX: 0, moveY: 128, actions: 0 }],
    ["moveY", { moveX: 0, moveY: Number.POSITIVE_INFINITY, actions: 0 }],
    ["actions", { moveX: 0, moveY: 0, actions: -1 }],
    ["actions", { moveX: 0, moveY: 0, actions: 0.5 }],
    ["actions", { moveX: 0, moveY: 0, actions: Number.NaN }],
    ["actions", { moveX: 0, moveY: 0, actions: 0x1_0000 }],
    ["actions", { moveX: 0, moveY: 0, actions: 0x0008 }],
    ["actions", { moveX: 0, moveY: 0, actions: 0xffff }],
  ] as const)("rejects invalid frame field %s atomically", (field, input) => {
    const state = createRunState(validConfig());
    const before = mutableSnapshot(state);

    expect(() => stepRun(state, input)).toThrowError(RangeError);
    expect(() => stepRun(state, input)).toThrowError(field);
    expect(mutableSnapshot(state)).toEqual(before);
  });

  test("does not consume RNG during an empty gameplay tick", () => {
    const state = createRunState(validConfig());
    const rngBefore = mutableSnapshot(state).rng;

    stepRun(state, { moveX: -10, moveY: 20, actions: 7 });

    expect(state.rng).toEqual(rngBefore);
  });

  test("advances an input list and treats an empty list as a no-op", () => {
    const state = createRunState(validConfig());
    const inputs: readonly InputFrame[] = [
      { moveX: -127, moveY: 127, actions: 1 },
      { moveX: 0, moveY: 0, actions: 2 },
      { moveX: 127, moveY: -127, actions: 4 },
    ];

    advanceRun(state, []);
    advanceRun(state, inputs);

    expect(state.tick).toBe(3);
    expect(state.input).toEqual(inputs[2]);
  });

  test("produces the same state for frame, batch, and partitioned execution", () => {
    const inputs: readonly InputFrame[] = [
      { moveX: -20, moveY: 30, actions: 1 },
      { moveX: 40, moveY: -50, actions: 3 },
      { moveX: 60, moveY: 70, actions: 7 },
    ];
    const stepped = createRunState(validConfig());
    const batched = createRunState(validConfig());
    const partitioned = createRunState(validConfig());
    const scratch = stepped.broadPhase;
    const candidates = scratch.candidateCodes;
    const contacts = scratch.contactCodes;

    for (const input of inputs) stepRun(stepped, input);
    advanceRun(batched, inputs);
    advanceRun(partitioned, inputs.slice(0, 1));
    advanceRun(partitioned, []);
    advanceRun(partitioned, inputs.slice(1));

    const expectedHash = hashRunState(stepped);
    expect(hashRunState(batched)).toBe(expectedHash);
    expect(hashRunState(partitioned)).toBe(expectedHash);
    expect(stepped.broadPhase).toBe(scratch);
    expect(stepped.broadPhase.candidateCodes).toBe(candidates);
    expect(stepped.broadPhase.contactCodes).toBe(contacts);
  });

  test("validates the complete batch before mutating", () => {
    const state = createRunState(validConfig());
    const before = mutableSnapshot(state);

    expect(() =>
      advanceRun(state, [
        { moveX: 10, moveY: 20, actions: 1 },
        { moveX: 128, moveY: 0, actions: 0 },
      ]),
    ).toThrowError("moveX");
    expect(mutableSnapshot(state)).toEqual(before);
  });

  test("rejects tick overflow before mutating a step or batch", () => {
    const input = { moveX: 1, moveY: 2, actions: 3 };
    const stepState = createRunState(validConfig());
    stepState.tick = 0xffffffff;
    const stepBefore = mutableSnapshot(stepState);
    expect(() => stepRun(stepState, input)).toThrowError(RangeError);
    expect(() => stepRun(stepState, input)).toThrowError("tick");
    expect(mutableSnapshot(stepState)).toEqual(stepBefore);

    const batchState = createRunState(validConfig());
    batchState.tick = 0xfffffffe;
    const batchBefore = mutableSnapshot(batchState);
    expect(() => advanceRun(batchState, [input, input])).toThrowError(
      RangeError,
    );
    expect(mutableSnapshot(batchState)).toEqual(batchBefore);
  });

  test("copies every consumed frame", () => {
    const state = createRunState(validConfig());
    const input = { moveX: 10, moveY: 20, actions: 3 };

    stepRun(state, input);
    input.moveX = 99;
    input.actions = 0;

    expect(state.input).toEqual({ moveX: 10, moveY: 20, actions: 3 });
  });

  test("advances exactly 100,000 deterministic frames", () => {
    const state = createRunState(validConfig());
    const inputs = Array.from({ length: 100_000 }, (_, index) => ({
      moveX: (index % 255) - 127,
      moveY: 127 - (index % 255),
      actions: 0,
    }));

    advanceRun(state, inputs);

    expect(state.tick).toBe(100_000);
    expect(state.input).toEqual(inputs.at(-1));
  });
});

describe("hashRunState", () => {
  test("returns a stable lowercase 64-bit FNV hash without mutation", () => {
    const state = createRunState(validConfig());
    stepRun(state, { moveX: -127, moveY: 127, actions: 7 });
    const before = fullSnapshot(state);

    const first = hashRunState(state);
    const second = hashRunState(state);

    expect(STATE_HASH_ALGORITHM).toBe("fnv1a64-v1");
    expect(first).toMatch(/^[0-9a-f]{16}$/);
    expect(second).toBe(first);
    expect(fullSnapshot(state)).toEqual(before);
  });

  test("canonicalizes semantically unordered modifiers before hashing", () => {
    const first = createRunState(
      validConfig({ modifierIds: ["modifier.z", "modifier.a"] }),
    );
    const second = createRunState(
      validConfig({ modifierIds: ["modifier.a", "modifier.z"] }),
    );

    expect(first.config).toEqual(second.config);
    expect(hashRunState(first)).toBe(hashRunState(second));
  });

  test("does not depend on JavaScript property insertion order", () => {
    const baseline = createRunState(validConfig());
    stepRun(baseline, { moveX: 10, moveY: -20, actions: 5 });
    const reordered = {
      rng: {
        patterns: { ...baseline.rng.patterns },
        weather: { ...baseline.rng.weather },
        loot: { ...baseline.rng.loot },
        spawn: { ...baseline.rng.spawn },
      },
      input: {
        actions: baseline.input.actions,
        moveY: baseline.input.moveY,
        moveX: baseline.input.moveX,
      },
      player: {
        status: baseline.player.status,
        invulnerabilityTicks: baseline.player.invulnerabilityTicks,
        health: {
          max: baseline.player.health.max,
          current: baseline.player.health.current,
        },
        velocity: {
          y: baseline.player.velocity.y,
          x: baseline.player.velocity.x,
        },
        position: {
          y: baseline.player.position.y,
          x: baseline.player.position.x,
        },
        definitionId: baseline.player.definitionId,
      },
      tick: baseline.tick,
      config: {
        modifierIds: baseline.config.modifierIds,
        loadoutId: baseline.config.loadoutId,
        aircraftId: baseline.config.aircraftId,
        contentVersion: baseline.config.contentVersion,
        rulesetVersion: baseline.config.rulesetVersion,
        seed: baseline.config.seed,
        mode: baseline.config.mode,
      },
      pools: baseline.pools,
      schemaVersion: baseline.schemaVersion,
      runStats: baseline.runStats,
      primaryCooldownTicks: baseline.primaryCooldownTicks,
    } as RunState;

    expect(hashRunState(reordered)).toBe(hashRunState(baseline));
  });

  test("changes for every canonical config, tick, and input field", () => {
    const baseline = createRunState(validConfig());
    const baselineHash = hashRunState(baseline);
    const changedStates = [
      createRunState(validConfig({ mode: "weekly" })),
      createRunState(
        validConfig({
          seed: parseTestSeed("8000000000000001ffffffff7fffffff"),
        }),
      ),
      createRunState(validConfig({ rulesetVersion: "rules.v2" })),
      createRunState(validConfig({ contentVersion: "content.v2" })),
      createRunState(validConfig({ aircraftId: "aircraft.spitfire.v1" })),
      createRunState(validConfig({ loadoutId: "loadout.weekly.v1" })),
      createRunState(validConfig({ modifierIds: ["modifier.other"] })),
    ];
    const tick = createRunState(validConfig());
    stepRun(tick, { moveX: 0, moveY: 0, actions: 0 });
    changedStates.push(tick);
    for (const input of [
      { moveX: 1, moveY: 0, actions: 0 },
      { moveX: 0, moveY: -1, actions: 0 },
      { moveX: 0, moveY: 0, actions: 1 },
    ]) {
      const state = createRunState(validConfig());
      state.input = input;
      changedStates.push(state);
    }

    expect(changedStates.map(hashRunState)).not.toContain(baselineHash);
  });

  test("includes schema and RNG algorithm discriminants", () => {
    const baseline = createRunState(validConfig());
    const changedSchema = createRunState(validConfig());
    const mutableSchema = changedSchema as unknown as { schemaVersion: number };
    mutableSchema.schemaVersion = 4;
    const changedAlgorithm = createRunState(validConfig());
    const mutableAlgorithm = changedAlgorithm.rng.spawn as unknown as {
      algorithm: string;
    };
    mutableAlgorithm.algorithm = "future-v2";

    expect(hashRunState(changedSchema)).not.toBe(hashRunState(baseline));
    expect(hashRunState(changedAlgorithm)).not.toBe(hashRunState(baseline));
  });

  test("changes for every canonical player field", () => {
    const baseline = createRunState(validConfig());
    const baselineHash = hashRunState(baseline);
    const mutate = (change: (state: RunState) => void): string => {
      const state = createRunState(validConfig());
      change(state);
      return hashRunState(state);
    };
    const hashes = [
      mutate(
        (state) =>
          ((state.player as { definitionId: string }).definitionId =
            "aircraft.other.v1"),
      ),
      mutate((state) => (state.player.position.x += 1)),
      mutate((state) => (state.player.position.y += 1)),
      mutate((state) => (state.player.velocity.x += 1)),
      mutate((state) => (state.player.velocity.y -= 1)),
      mutate((state) => (state.player.health.current -= 1)),
      mutate((state) => ((state.player.health as { max: number }).max += 1)),
      mutate((state) => (state.player.invulnerabilityTicks += 1)),
      mutate((state) => (state.player.status = "destroyed")),
    ];
    expect(new Set(hashes).size).toBe(hashes.length);
    expect(hashes).not.toContain(baselineHash);
  });

  test("changes for every word in every RNG stream", () => {
    const baseline = createRunState(validConfig());
    const baselineHash = hashRunState(baseline);
    const streamIds = ["spawn", "loot", "weather", "patterns"] as const;
    const wordIds = ["s0", "s1", "s2", "s3"] as const;
    const hashes: string[] = [];

    for (const streamId of streamIds) {
      for (const wordId of wordIds) {
        const state = createRunState(validConfig());
        state.rng[streamId][wordId] = (state.rng[streamId][wordId] + 1) >>> 0;
        hashes.push(hashRunState(state));
      }
    }

    expect(hashes).toHaveLength(16);
    expect(hashes).not.toContain(baselineHash);
  });

  test("excludes adapter and cosmetic metadata from state and hash", () => {
    const metadataVariants = [
      {
        locale: "pt-BR",
        timezone: "America/Sao_Paulo",
        audio: 0,
        quality: "low",
        viewport: "320x568",
        fps: 30,
        cosmeticPackId: "pack.a",
      },
      {
        locale: "ja",
        timezone: "Asia/Tokyo",
        audio: 1,
        quality: "high",
        viewport: "1920x1080",
        fps: 144,
        cosmeticPackId: "pack.b",
      },
    ];

    const hashes = metadataVariants.map((metadata) => {
      const state = createRunState({
        ...validConfig(),
        ...metadata,
      });
      return hashRunState(state);
    });

    expect(hashes[0]).toBe(hashes[1]);
  });
});

function mutableSnapshot(state: RunState) {
  return {
    tick: state.tick,
    input: { ...state.input },
    rng: {
      spawn: { ...state.rng.spawn },
      loot: { ...state.rng.loot },
      weather: { ...state.rng.weather },
      patterns: { ...state.rng.patterns },
    },
  };
}

function fullSnapshot(state: RunState) {
  return {
    schemaVersion: state.schemaVersion,
    config: {
      ...state.config,
      modifierIds: [...state.config.modifierIds],
    },
    ...mutableSnapshot(state),
  };
}

function parseTestSeed(input: string): RunConfig["seed"] {
  const parsed = parseSeedHex(input);
  if (!parsed.ok) throw new Error(`Invalid test seed: ${parsed.code}`);
  return parsed.value;
}
