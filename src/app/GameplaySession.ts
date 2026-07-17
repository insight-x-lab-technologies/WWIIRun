import {
  activateEnemy,
  createRunState,
  stepRun,
  type RunState,
} from "../simulation/run";
import type { Seed128 } from "../simulation/random";
import type { InputSource } from "../game/input";

export type RunLifecyclePort = { setRunActive(active: boolean): void };
export type PauseReason = "visibility" | "focus" | "viewport-change";
const STEP_MS = 1000 / 60;
const MAX_TICKS_PER_UPDATE = 5;
const DEMO_CONFIG = Object.freeze({
  mode: "endless" as const,
  seed: "00112233445566778899aabbccddeeff" as Seed128,
  rulesetVersion: "f1-demo-v1",
  contentVersion: "core-v1",
  aircraftId: "aircraft.placeholder.v1",
  loadoutId: "loadout.placeholder.v1",
  modifierIds: Object.freeze([] as string[]),
});

export class GameplaySession {
  private readonly state: RunState = createRunState(DEMO_CONFIG);
  private readonly inputFrame = { moveX: 0, moveY: 0, actions: 0 };
  private readonly updateResult = { ticks: 0, dropped: false };
  private readonly paused = new Set<PauseReason>();
  private accumulator = 0;
  private started = false;
  private destroyed = false;
  public constructor(
    private readonly input: InputSource,
    private readonly lifecycle: RunLifecyclePort,
  ) {}
  start(): void {
    this.assertAlive();
    if (this.started) return;
    this.started = true;
    this.lifecycle.setRunActive(true);
  }
  update(renderDeltaMs: number): { ticks: number; dropped: boolean } {
    this.assertAlive();
    if (!Number.isFinite(renderDeltaMs) || renderDeltaMs < 0)
      throw new RangeError("renderDeltaMs must be finite and non-negative.");
    if (!this.started || this.paused.size > 0) {
      this.updateResult.ticks = 0;
      this.updateResult.dropped = false;
      return this.updateResult;
    }
    this.accumulator += renderDeltaMs;
    const available = Math.floor(
      (this.accumulator + Number.EPSILON * 100) / STEP_MS,
    );
    const ticks = Math.min(available, MAX_TICKS_PER_UPDATE);
    for (let index = 0; index < ticks; index += 1) {
      const frame =
        this.input.sampleInto?.(this.inputFrame) ?? this.input.sample();
      stepRun(this.state, frame);
    }
    const dropped = available > MAX_TICKS_PER_UPDATE;
    this.accumulator = dropped ? 0 : this.accumulator - ticks * STEP_MS;
    this.updateResult.ticks = ticks;
    this.updateResult.dropped = dropped;
    return this.updateResult;
  }
  pause(reason: PauseReason): void {
    this.assertAlive();
    this.paused.add(reason);
    this.accumulator = 0;
    this.input.reset?.();
  }
  resume(reason: PauseReason): void {
    this.assertAlive();
    this.paused.delete(reason);
    this.accumulator = 0;
    this.input.reset?.();
  }
  snapshot(): { state: RunState; paused: boolean } {
    this.assertAlive();
    return { state: this.state, paused: this.paused.size > 0 };
  }
  activateDiagnosticEnemy(
    definitionId: "enemy.scout.v1" | "enemy.interceptor.v1",
    x: number,
    y: number,
  ): void {
    this.assertAlive();
    activateEnemy(this.state.pools, definitionId, x, y);
  }
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.input.reset?.();
    if (this.started) this.lifecycle.setRunActive(false);
  }
  private assertAlive(): void {
    if (this.destroyed) throw new Error("GameplaySession is destroyed.");
  }
}
