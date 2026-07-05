import type { RngState, RngStreamId, Seed128 } from "../random";
import type { PlayerState } from "../aircraft";

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
  readonly schemaVersion: 2;
  readonly config: RunConfig;
  tick: number;
  input: InputFrame;
  readonly player: PlayerState;
  readonly rng: Record<RngStreamId, RngState>;
};

export type StateHashAlgorithm = "fnv1a64-v1";
export type StateHash = string & { readonly __stateHash: unique symbol };
