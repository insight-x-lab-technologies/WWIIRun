import { createRngStreams, parseSeedHex } from "../random";
import type { InputFrame, RunConfig, RunMode, RunState } from "./types";

export const TICKS_PER_SECOND = 60 as const;
export const RUN_STATE_SCHEMA_VERSION = 1 as const;

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
    rng: createRngStreams(canonicalConfig.seed),
  };
}

export function stepRun(state: RunState, input: InputFrame): void {
  validateInputFrame(input);
  validateTickCapacity(state.tick, 1);

  state.input = copyInput(input);
  state.tick += 1;
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

function copyInput(input: InputFrame): InputFrame {
  return {
    moveX: input.moveX,
    moveY: input.moveY,
    actions: input.actions,
  };
}
