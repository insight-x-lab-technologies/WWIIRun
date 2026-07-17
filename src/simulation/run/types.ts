import type { RngState, RngStreamId, Seed128 } from "../random";
import type { PlayerState } from "../aircraft";
import type { EntityPools } from "../entities";
import type { BroadPhaseScratch } from "../broadPhase";

export type RunMode = "endless" | "daily" | "weekly";

export type RunConfig = {
  readonly mode: RunMode;
  readonly seed: Seed128;
  readonly rulesetVersion: string;
  readonly contentVersion: string;
  readonly aircraftId: string;
  readonly loadoutId: string;
  readonly modifierIds: readonly string[];
};

export type InputFrame = {
  readonly moveX: number;
  readonly moveY: number;
  readonly actions: number;
};

export type RunState = {
  readonly schemaVersion: 6;
  readonly config: RunConfig;
  tick: number;
  input: InputFrame;
  readonly player: PlayerState;
  readonly rng: Record<RngStreamId, RngState>;
  readonly pools: EntityPools;
  readonly broadPhase: BroadPhaseScratch;
  readonly runStats: RunStats;
  primaryCooldownTicks: number;
};

export type RunStats = {
  runCoins: number;
  coinsSpawned: number;
  coinsCollected: number;
  enemiesDestroyed: number;
};

export type StateHashAlgorithm = "fnv1a64-v1";
export type StateHash = string & { readonly __stateHash: unique symbol };
