import { createRngStreams, nextUint32, parseSeedHex } from "../random";
import {
  applyDamage,
  createPlayerState,
  PLACEHOLDER_AIRCRAFT,
  stepPlayer,
} from "../aircraft";
import {
  applyEnemyDamage,
  createEntityPools,
  MACHINE_GUN,
  stepEnemyBehaviors,
  stepEntityPools,
  tryActivateCoin,
  tryActivateProjectile,
} from "../entities";
import { applyStructureModuleDamage, stepStructures } from "../structures";
import { createBroadPhaseScratch, collectContacts } from "../broadPhase";
import type { InputFrame, RunConfig, RunMode, RunState } from "./types";

export const TICKS_PER_SECOND = 60 as const;
export const RUN_STATE_SCHEMA_VERSION = 6 as const;

export const InputActionBits = {
  firePrimary: 0x0001,
  fireSecondary: 0x0002,
  special: 0x0004,
} as const;

const RUN_MODES: readonly RunMode[] = ["endless", "daily", "weekly"];
const TOKEN_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,63}$/;
const MAX_MODIFIERS = 32;
const MAX_TICK = 0xffffffff;
const MIN_AXIS = -127;
const MAX_AXIS = 127;
const ALLOWED_ACTION_MASK = 0x0007;

export function createRunState(config: RunConfig): RunState {
  validateMode(config.mode);
  validateCanonicalSeed(config.seed);
  validateToken("rulesetVersion", config.rulesetVersion);
  validateToken("contentVersion", config.contentVersion);
  validateToken("aircraftId", config.aircraftId);
  validateToken("loadoutId", config.loadoutId);
  const modifierIds = canonicalizeModifierIds(config.modifierIds);
  const canonicalConfig: RunConfig = Object.freeze({
    mode: config.mode,
    seed: config.seed,
    rulesetVersion: config.rulesetVersion,
    contentVersion: config.contentVersion,
    aircraftId: config.aircraftId,
    loadoutId: config.loadoutId,
    modifierIds,
  });

  return {
    schemaVersion: RUN_STATE_SCHEMA_VERSION,
    config: canonicalConfig,
    tick: 0,
    input: { moveX: 0, moveY: 0, actions: 0 },
    player: createPlayerState(),
    rng: createRngStreams(canonicalConfig.seed),
    pools: createEntityPools(),
    broadPhase: createBroadPhaseScratch(),
    runStats: {
      runCoins: 0,
      coinsSpawned: 0,
      coinsCollected: 0,
      enemiesDestroyed: 0,
    },
    primaryCooldownTicks: 0,
  };
}

export function stepRun(state: RunState, input: InputFrame): void {
  validateInputFrame(input);
  validateTickCapacity(state.tick, 1);

  const stateInput = state.input as {
    moveX: number;
    moveY: number;
    actions: number;
  };
  stateInput.moveX = input.moveX;
  stateInput.moveY = input.moveY;
  stateInput.actions = input.actions;
  stepPlayer(state.player, input);
  if (state.primaryCooldownTicks > 0) state.primaryCooldownTicks -= 1;
  if (
    (input.actions & InputActionBits.firePrimary) !== 0 &&
    state.player.status === "active" &&
    state.primaryCooldownTicks === 0
  ) {
    const spawned = tryActivateProjectile(
      state.pools,
      state.player.position.x + PLACEHOLDER_AIRCRAFT.muzzle.x,
      state.player.position.y + PLACEHOLDER_AIRCRAFT.muzzle.y,
      MACHINE_GUN.velocityX,
      MACHINE_GUN.damage,
    );
    if (spawned) state.primaryCooldownTicks = MACHINE_GUN.cooldownTicks;
  }
  stepEnemyBehaviors(state.pools, state.player.position.y);
  stepEntityPools(state.pools);
  stepStructures(state.pools);
  collectContacts(
    state.pools,
    state.player,
    PLACEHOLDER_AIRCRAFT.hitboxes,
    state.broadPhase,
  );
  resolveContacts(state);
  state.tick += 1;
}
function resolveContacts(state: RunState): void {
  const damagedStructures = state.broadPhase.playerStructureDamage;
  for (let i = 0; i < state.broadPhase.contactCount; i += 1) {
    const code = state.broadPhase.contactCodes[i]!;
    if (code < 64) {
      const enemy = state.pools.enemies[code]!;
      if (enemy.active) applyDamage(state.player, enemy.contactDamage);
      continue;
    }
    if (code < 192) continue;
    if (code < 256) {
      const structureIndex = Math.floor((code - 192) / 4);
      if (damagedStructures[structureIndex] === 0) {
        const structure = state.pools.structures[structureIndex]!;
        if (structure.active) applyDamage(state.player, 12);
        damagedStructures[structureIndex] = 1;
      }
      continue;
    }
    if (code < 16_640) {
      const pair = code - 256;
      const projectile = state.pools.projectiles[Math.floor(pair / 64)]!;
      const enemy = state.pools.enemies[pair % 64]!;
      if (!projectile.active || !enemy.active) continue;
      const damage = projectile.damage;
      clearProjectile(projectile);
      const enemyIndex = pair % 64;
      const pivotX = enemy.position.x;
      const pivotY = enemy.position.y;
      if (applyEnemyDamage(state.pools, enemyIndex, damage) === "destroyed")
        resolveEnemyLoot(state, pivotX, pivotY);
      continue;
    }
    const pair = code - 16_640;
    const projectile = state.pools.projectiles[Math.floor(pair / 64)]!;
    const structureIndex = Math.floor((pair % 64) / 4);
    const moduleIndex = pair % 4;
    const structure = state.pools.structures[structureIndex]!;
    if (
      !projectile.active ||
      !structure.active ||
      !structure.modules[moduleIndex]!.active
    )
      continue;
    const damage = projectile.damage;
    clearProjectile(projectile);
    applyStructureModuleDamage(
      state.pools,
      structureIndex,
      moduleIndex,
      damage,
    );
  }
  collectCoins(state);
}
function resolveEnemyLoot(
  state: RunState,
  pivotX: number,
  pivotY: number,
): void {
  incrementStat(state.runStats, "enemiesDestroyed");
  if (nextUint32(state.rng.loot) >= 0x80000000) return;
  if (tryActivateCoin(state.pools, pivotX, pivotY))
    incrementStat(state.runStats, "coinsSpawned");
}
function collectCoins(state: RunState): void {
  for (let i = 0; i < state.broadPhase.contactCount; i += 1) {
    const code = state.broadPhase.contactCodes[i]!;
    if (code < 64 || code >= 192) continue;
    const coin = state.pools.coins[code - 64]!;
    if (!coin.active) continue;
    const value = coin.value;
    clearCoin(coin);
    addStat(state.runStats, "runCoins", value);
    incrementStat(state.runStats, "coinsCollected");
  }
}
function clearCoin(coin: {
  active: boolean;
  definitionId: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  damage: number;
  health: { current: number; max: number };
  behavior: "" | "scout" | "interceptor";
  contactDamage: number;
  value: number;
}): void {
  coin.active = false;
  coin.definitionId = "";
  coin.position.x = coin.position.y = coin.velocity.x = coin.velocity.y = 0;
  coin.damage = 0;
  coin.health.current = coin.health.max = 0;
  coin.behavior = "";
  coin.contactDamage = 0;
  coin.value = 0;
}
function incrementStat(
  stats: RunState["runStats"],
  key: keyof RunState["runStats"],
): void {
  addStat(stats, key, 1);
}
function addStat(
  stats: RunState["runStats"],
  key: keyof RunState["runStats"],
  amount: number,
): void {
  stats[key] = Math.min(0xffffffff, stats[key] + amount);
}
function clearProjectile(projectile: {
  active: boolean;
  definitionId: string;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  damage: number;
}): void {
  projectile.active = false;
  projectile.definitionId = "";
  projectile.position.x =
    projectile.position.y =
    projectile.velocity.x =
    projectile.velocity.y =
      0;
  projectile.damage = 0;
}

export function advanceRun(
  state: RunState,
  inputs: readonly InputFrame[],
): void {
  for (const input of inputs) {
    validateInputFrame(input);
  }
  validateTickCapacity(state.tick, inputs.length);

  for (const input of inputs) {
    stepRun(state, input);
  }
}

function validateMode(mode: RunMode): void {
  if (!RUN_MODES.includes(mode)) {
    throw new TypeError("config.mode must be endless, daily, or weekly.");
  }
}

function validateCanonicalSeed(seed: RunConfig["seed"]): void {
  if (typeof seed !== "string") {
    throw new TypeError("config.seed must be a canonical Seed128.");
  }
  const parsed = parseSeedHex(seed);
  if (!parsed.ok || parsed.value !== seed) {
    throw new TypeError("config.seed must be a canonical Seed128.");
  }
}

function validateToken(field: string, value: unknown): asserts value is string {
  if (typeof value !== "string" || !TOKEN_PATTERN.test(value)) {
    throw new TypeError(`config.${field} must be a canonical ASCII token.`);
  }
}

function canonicalizeModifierIds(modifierIds: unknown): readonly string[] {
  if (!Array.isArray(modifierIds) || modifierIds.length > MAX_MODIFIERS) {
    throw new TypeError("config.modifierIds must contain at most 32 items.");
  }

  const items: readonly unknown[] = modifierIds;
  const canonical: string[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const modifierId = items[index];
    validateToken(`modifierIds[${index}]`, modifierId);
    canonical.push(modifierId);
  }
  canonical.sort();
  for (let index = 1; index < canonical.length; index += 1) {
    if (canonical[index - 1] === canonical[index]) {
      throw new TypeError("config.modifierIds must not contain duplicates.");
    }
  }
  return Object.freeze(canonical);
}

function validateInputFrame(input: InputFrame): void {
  validateAxis("moveX", input.moveX);
  validateAxis("moveY", input.moveY);
  if (
    !Number.isInteger(input.actions) ||
    input.actions < 0 ||
    input.actions > 0xffff ||
    (input.actions & ~ALLOWED_ACTION_MASK) !== 0
  ) {
    throw new RangeError(
      "input.actions must be an integer using only action bits 0x0007.",
    );
  }
}

function validateAxis(field: "moveX" | "moveY", value: number): void {
  if (!Number.isInteger(value) || value < MIN_AXIS || value > MAX_AXIS) {
    throw new RangeError(
      `input.${field} must be an integer between -127 and 127.`,
    );
  }
}

function validateTickCapacity(tick: number, additionalTicks: number): void {
  if (additionalTicks > MAX_TICK - tick) {
    throw new RangeError("state.tick cannot advance beyond 4294967295.");
  }
}
