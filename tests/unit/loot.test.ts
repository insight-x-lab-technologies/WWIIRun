import { describe, expect, test } from "vitest";

import { parseSeedHex } from "../../src/simulation/random";
import {
  MAX_COINS,
  activateCoin,
  activateEnemy,
  createRunState,
  hashRunState,
  stepRun,
  tryActivateProjectile,
  type RunConfig,
} from "../../src/simulation/run";

const parsed = parseSeedHex("0123456789abcdeffedcba9876543210");
if (!parsed.ok) throw new Error("test seed invalid");
const config: RunConfig = {
  mode: "daily",
  seed: parsed.value,
  rulesetVersion: "rules.v1",
  contentVersion: "content.v1",
  aircraftId: "aircraft.placeholder.v1",
  loadoutId: "loadout.v1",
  modifierIds: [],
};
const idle = { moveX: 0, moveY: 0, actions: 0 } as const;

describe("F1-06 deterministic loot and run statistics", () => {
  test("uses only the loot stream and the literal 50% threshold for enemy deaths", () => {
    const winner = createRunState(config);
    const loser = createRunState(config);
    for (const state of [winner, loser]) {
      activateEnemy(
        state.pools,
        "enemy.scout.v1",
        60_000,
        state.player.position.y,
      );
      tryActivateProjectile(state.pools, 59_488, state.player.position.y, 0, 3);
      state.rng.loot.s0 = 1;
      state.rng.loot.s2 = 0;
      state.rng.loot.s3 = 0;
    }
    winner.rng.loot.s1 = 0xb61c71c7; // nextUint32() === 0x7fffffff
    loser.rng.loot.s1 = 0xcd000000; // nextUint32() === 0x80000000
    const winnerOtherStreams = structuredClone({
      spawn: winner.rng.spawn,
      weather: winner.rng.weather,
      patterns: winner.rng.patterns,
    });

    stepRun(winner, idle);
    stepRun(loser, idle);

    expect(winner.runStats).toEqual({
      runCoins: 0,
      coinsSpawned: 1,
      coinsCollected: 0,
      enemiesDestroyed: 1,
    });
    expect(loser.runStats).toEqual({
      runCoins: 0,
      coinsSpawned: 0,
      coinsCollected: 0,
      enemiesDestroyed: 1,
    });
    expect(winner.pools.coins[0]).toMatchObject({
      active: true,
      definitionId: "coin.placeholder.v1",
      position: { x: 59_488, y: winner.player.position.y },
      velocity: { x: -256, y: 0 },
      value: 1,
    });
    expect({
      spawn: winner.rng.spawn,
      weather: winner.rng.weather,
      patterns: winner.rng.patterns,
    }).toEqual(winnerOtherStreams);
  });

  test("activates coins atomically and retains circular order after exhaustion", () => {
    const state = createRunState(config);
    const before = hashRunState(state);
    expect(() => activateCoin(state.pools, 0, 0, 0, 0, 0)).toThrow(RangeError);
    expect(hashRunState(state)).toBe(before);
    for (let index = 0; index < MAX_COINS; index += 1)
      expect(activateCoin(state.pools, index, 200_000, 0, 0, 1)).toEqual({
        status: "spawned",
        id: `coin:${index}`,
      });
    const cursor = state.pools.cursors.coin;
    const full = hashRunState(state);
    expect(activateCoin(state.pools, 0, 0, 0, 0, 1)).toEqual({
      status: "exhausted",
    });
    expect(state.pools.cursors.coin).toBe(cursor);
    expect(hashRunState(state)).toBe(full);
    state.pools.coins[5]!.active = false;
    expect(activateCoin(state.pools, 5, 200_000, 0, 0, 1)).toEqual({
      status: "spawned",
      id: "coin:5",
    });
    expect(state.pools.cursors.coin).toBe(6);
  });

  test("collects active coins once in contact-code order and saturates stats", () => {
    const state = createRunState(config);
    activateCoin(
      state.pools,
      state.player.position.x,
      state.player.position.y,
      0,
      0,
      2,
    );
    activateCoin(
      state.pools,
      state.player.position.x,
      state.player.position.y,
      0,
      0,
      3,
    );
    stepRun(state, idle);
    expect(state.runStats).toEqual({
      runCoins: 5,
      coinsSpawned: 0,
      coinsCollected: 2,
      enemiesDestroyed: 0,
    });
    expect(state.pools.coins[0]!.active).toBe(false);
    expect(state.pools.coins[1]!.active).toBe(false);
    stepRun(state, idle);
    expect(state.runStats.coinsCollected).toBe(2);

    state.runStats.runCoins = 0xffffffff;
    state.runStats.coinsCollected = 0xffffffff;
    activateCoin(
      state.pools,
      state.player.position.x,
      state.player.position.y,
      0,
      0,
      1,
    );
    stepRun(state, idle);
    expect(state.runStats.runCoins).toBe(0xffffffff);
    expect(state.runStats.coinsCollected).toBe(0xffffffff);
  });

  test("hashes stats and coin value but excludes scratch", () => {
    const baseline = createRunState(config);
    const stats = createRunState(config);
    const coin = createRunState(config);
    stats.runStats.runCoins = 1;
    activateCoin(coin.pools, 100_000, 200_000, 0, 0, 2);
    expect(hashRunState(stats)).not.toBe(hashRunState(baseline));
    expect(hashRunState(coin)).not.toBe(hashRunState(baseline));
    const before = hashRunState(coin);
    coin.broadPhase.metrics.activeEntities = 99;
    expect(hashRunState(coin)).toBe(before);
  });

  test("reuses the coin pool, cursor, and broad-phase scratch for 120 ticks", () => {
    const state = createRunState(config);
    const coins = state.pools.coins;
    const scratch = state.broadPhase;
    for (let index = 0; index < MAX_COINS; index += 1)
      activateCoin(state.pools, index, 200_000, 0, 0, 1);
    for (let tick = 0; tick < 120; tick += 1) stepRun(state, idle);
    expect(state.pools.coins).toBe(coins);
    expect(state.broadPhase).toBe(scratch);
    expect(state.pools.cursors.coin).toBe(0);
    expect(state.pools.coins.filter((coin) => coin.active)).toHaveLength(
      MAX_COINS,
    );
  });
});
