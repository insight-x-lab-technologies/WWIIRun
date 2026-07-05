import { createCompoundHitbox, type CompoundHitbox } from "../collision";
import type { InputFrame } from "../run/types";

export const SIMULATION_UNITS_PER_LOGICAL_PIXEL = 256 as const;
export const DAMAGE_AMOUNT_CAP = 1_000_000 as const;

export type PlayerStatus = "active" | "destroyed";
export type PlayerState = {
  readonly definitionId: string;
  readonly position: { x: number; y: number };
  readonly velocity: { x: number; y: number };
  readonly health: { current: number; readonly max: number };
  invulnerabilityTicks: number;
  status: PlayerStatus;
};
export type GameplayAircraftDefinition = {
  readonly id: string;
  readonly maxHealth: number;
  readonly damageInvulnerabilityTicks: number;
  readonly acceleration: number;
  readonly maxSpeed: number;
  readonly drag: number;
  readonly spawn: Readonly<{ x: number; y: number }>;
  readonly bounds: Readonly<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  }>;
  readonly hitboxes: CompoundHitbox;
};

const U = SIMULATION_UNITS_PER_LOGICAL_PIXEL;
export const PLACEHOLDER_AIRCRAFT: GameplayAircraftDefinition = Object.freeze({
  id: "aircraft.placeholder.v1",
  maxHealth: 100,
  damageInvulnerabilityTicks: 30,
  acceleration: 96,
  maxSpeed: 768,
  drag: 64,
  spawn: Object.freeze({ x: 160 * U, y: 270 * U }),
  bounds: Object.freeze({
    minX: 48 * U,
    maxX: 320 * U,
    minY: 32 * U,
    maxY: 508 * U,
  }),
  hitboxes: createCompoundHitbox([
    {
      kind: "aabb",
      offsetX: 0,
      offsetY: 0,
      halfWidth: 22 * U,
      halfHeight: 8 * U,
    },
    {
      kind: "aabb",
      offsetX: -4 * U,
      offsetY: 0,
      halfWidth: 8 * U,
      halfHeight: 20 * U,
    },
    { kind: "circle", offsetX: 22 * U, offsetY: 0, radius: 6 * U },
  ]),
});

export function createPlayerState(): PlayerState {
  const definition = PLACEHOLDER_AIRCRAFT;
  return {
    definitionId: definition.id,
    position: { ...definition.spawn },
    velocity: { x: 0, y: 0 },
    health: { current: definition.maxHealth, max: definition.maxHealth },
    invulnerabilityTicks: 0,
    status: "active",
  };
}

export function stepPlayer(player: PlayerState, input: InputFrame): void {
  if (player.status === "destroyed") {
    player.velocity.x = 0;
    player.velocity.y = 0;
    return;
  }
  if (player.invulnerabilityTicks > 0) player.invulnerabilityTicks -= 1;
  stepAxis(
    player,
    "x",
    input.moveX,
    PLACEHOLDER_AIRCRAFT.bounds.minX,
    PLACEHOLDER_AIRCRAFT.bounds.maxX,
  );
  stepAxis(
    player,
    "y",
    input.moveY,
    PLACEHOLDER_AIRCRAFT.bounds.minY,
    PLACEHOLDER_AIRCRAFT.bounds.maxY,
  );
}

export type DamageResult = "applied" | "ignored" | "destroyed";
export function applyDamage(player: PlayerState, amount: number): DamageResult {
  if (!Number.isInteger(amount) || amount <= 0 || amount > DAMAGE_AMOUNT_CAP)
    throw new RangeError(
      `amount must be a positive integer at most ${DAMAGE_AMOUNT_CAP}.`,
    );
  if (player.status === "destroyed" || player.invulnerabilityTicks > 0)
    return "ignored";
  player.health.current = Math.max(0, player.health.current - amount);
  if (player.health.current === 0) {
    player.status = "destroyed";
    player.velocity.x = 0;
    player.velocity.y = 0;
    player.invulnerabilityTicks = 0;
    return "destroyed";
  }
  player.invulnerabilityTicks = PLACEHOLDER_AIRCRAFT.damageInvulnerabilityTicks;
  return "applied";
}

function stepAxis(
  player: PlayerState,
  axis: "x" | "y",
  input: number,
  min: number,
  max: number,
): void {
  let velocity = player.velocity[axis];
  if (input === 0) velocity = approachZero(velocity, PLACEHOLDER_AIRCRAFT.drag);
  else
    velocity = clamp(
      velocity + Math.trunc((input * PLACEHOLDER_AIRCRAFT.acceleration) / 127),
      -PLACEHOLDER_AIRCRAFT.maxSpeed,
      PLACEHOLDER_AIRCRAFT.maxSpeed,
    );
  const position = clamp(player.position[axis] + velocity, min, max);
  if ((position === min && velocity < 0) || (position === max && velocity > 0))
    velocity = 0;
  player.position[axis] = position;
  player.velocity[axis] = velocity;
}
function approachZero(value: number, amount: number): number {
  return value > 0 ? Math.max(0, value - amount) : Math.min(0, value + amount);
}
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
