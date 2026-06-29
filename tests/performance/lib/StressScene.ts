import Phaser from "phaser";

import { parseSeedHex, type Seed128 } from "../../../src/simulation/random";
import {
  createRunState,
  stepRun,
  type RunState,
} from "../../../src/simulation/run";
import { MeasurementCollector } from "./measurement";
import {
  PARALLAX_LAYER_COUNT,
  WORKLOAD_IMAGE_COUNT,
  workloadPosition,
} from "./workload";

const FIXED_TICK_MS = 1_000 / 60;
const TEXTURE_KEY = "tier-base-stress-v1-dot";

export class StressScene extends Phaser.Scene {
  readonly #collector: MeasurementCollector;
  readonly #images: Phaser.GameObjects.Image[] = [];
  readonly #layers: Phaser.GameObjects.TileSprite[] = [];
  #diagnosticText: Phaser.GameObjects.Text | null = null;
  #state: RunState | null = null;
  #accumulatorMs = 0;
  #lastTextTick = -60;

  public constructor(collector: MeasurementCollector) {
    super("tier-base-stress-v1");
    this.#collector = collector;
  }

  public create(): void {
    const graphics = this.add.graphics({ x: 0, y: 0 });
    graphics.fillStyle(0xd8c58f, 1);
    graphics.fillRect(0, 0, 16, 16);
    graphics.generateTexture(TEXTURE_KEY, 16, 16);
    graphics.destroy();

    const { width, height } = this.scale;
    for (let index = 0; index < PARALLAX_LAYER_COUNT; index += 1) {
      this.#layers.push(
        this.add
          .tileSprite(width / 2, height / 2, width, height, TEXTURE_KEY)
          .setAlpha(0.025 + index * 0.015)
          .setTint(0x537895 + index * 0x10101),
      );
    }
    for (let index = 0; index < WORKLOAD_IMAGE_COUNT; index += 1) {
      this.#images.push(
        this.add
          .image(0, 0, TEXTURE_KEY)
          .setDisplaySize(5 + (index % 4), 5 + (index % 4))
          .setAlpha(0.45 + (index % 5) * 0.1)
          .setVisible(true),
      );
    }
    this.#diagnosticText = this.add.text(12, 12, "tier-base-stress-v1", {
      color: "#f4f0e6",
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
    });
    this.#state = createRunState({
      mode: "endless",
      seed: performanceSeed(),
      rulesetVersion: "performance.v1",
      contentVersion: "performance.v1",
      aircraftId: "aircraft.performance.placeholder",
      loadoutId: "loadout.performance.neutral",
      modifierIds: [],
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.#releaseReferences(),
    );
    this.#applyLogicalTick();
  }

  public override update(_time: number, delta: number): void {
    this.#accumulatorMs += delta;
    while (this.#accumulatorMs >= FIXED_TICK_MS) {
      const startedAt = performance.now();
      stepRun(this.#requireState(), { moveX: 0, moveY: 0, actions: 0 });
      this.#applyLogicalTick();
      const finishedAt = performance.now();
      if (this.#collector.isCollecting(finishedAt)) {
        this.#collector.recordTick(finishedAt - startedAt);
      }
      this.#accumulatorMs -= FIXED_TICK_MS;
    }
  }

  #applyLogicalTick(): void {
    const state = this.#requireState();
    const { width, height } = this.scale;
    for (let index = 0; index < this.#images.length; index += 1) {
      const image = this.#images[index];
      if (image === undefined) continue;
      const position = workloadPosition(index, state.tick, width, height);
      image.setPosition(position.x, position.y);
      image.setRotation(
        (position.rotationMilliDegrees / 1_000) * (Math.PI / 180),
      );
    }
    for (let index = 0; index < this.#layers.length; index += 1) {
      const layer = this.#layers[index];
      if (layer === undefined) continue;
      layer.tilePositionX = state.tick * (index + 1);
      layer.tilePositionY = state.tick * (index + 2);
    }
    if (state.tick - this.#lastTextTick >= 60) {
      this.#diagnosticText?.setText(
        `tier-base-stress-v1 | tick ${state.tick} | images ${WORKLOAD_IMAGE_COUNT}`,
      );
      this.#lastTextTick = state.tick;
    }
  }

  #releaseReferences(): void {
    this.#images.length = 0;
    this.#layers.length = 0;
    this.#diagnosticText = null;
    this.#state = null;
  }

  #requireState(): RunState {
    if (this.#state === null)
      throw new Error("stress scene is not initialized.");
    return this.#state;
  }
}

function performanceSeed(): Seed128 {
  const result = parseSeedHex("0123456789abcdeffedcba9876543210");
  if (!result.ok) throw new Error("performance harness seed is invalid.");
  return result.value;
}
