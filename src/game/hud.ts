import Phaser from "phaser";

import type { ViewportLayout } from "../platform/viewport/layout";
import type { RunState } from "../simulation/run";

const HUD_DEPTH = 8;
const FPS_WINDOW = 30;

export type HudViewModel = Readonly<{
  life: string;
  distance: string;
  coins: string;
  fps: string;
  level: string;
  speed: string;
  seed: string;
  fullSeed: string;
}>;

export function formatDistance(tick: number): string {
  return `${Math.floor(tick / 60)} m`;
}

export function formatSpeed(
  velocity: Readonly<{ x: number; y: number }>,
): string {
  return `${Math.round((Math.max(Math.abs(velocity.x), Math.abs(velocity.y)) * 60 * 3.6) / 256)} km/h`;
}

export function formatCompactSeed(seed: string): string {
  return `${seed.slice(0, 8)}…${seed.slice(-8)}`;
}

export class RenderFpsWindow {
  private readonly samples = new Float64Array(FPS_WINDOW);
  private index = 0;
  private count = 0;
  private total = 0;

  public update(delta: number): string {
    if (!Number.isFinite(delta) || delta <= 0) {
      this.reset();
      return "—";
    }
    const frameRate = 1000 / delta;
    if (this.count === FPS_WINDOW) this.total -= this.samples[this.index]!;
    else this.count += 1;
    this.samples[this.index] = frameRate;
    this.total += frameRate;
    this.index = (this.index + 1) % FPS_WINDOW;
    return `${Math.round(this.total / this.count)} FPS`;
  }

  public reset(): void {
    this.samples.fill(0);
    this.index = 0;
    this.count = 0;
    this.total = 0;
  }
}

export function projectHud(state: RunState, fps: string): HudViewModel {
  return {
    life: `${state.player.health.current}/${state.player.health.max}`,
    distance: formatDistance(state.tick),
    coins: String(state.runStats.runCoins),
    fps,
    level: "1",
    speed: formatSpeed(state.player.velocity),
    seed: formatCompactSeed(state.config.seed),
    fullSeed: state.config.seed,
  };
}

export class GameplayHud {
  private readonly fps = new RenderFpsWindow();
  private life: Phaser.GameObjects.Text | undefined;
  private distance: Phaser.GameObjects.Text | undefined;
  private coins: Phaser.GameObjects.Text | undefined;
  private diagnostics: Phaser.GameObjects.Text | undefined;
  private active = false;

  public constructor(private readonly scene: Phaser.Scene) {}

  public create(): void {
    if (this.active) return;
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      color: "#f4f0e6",
      fontFamily: "system-ui, sans-serif",
      fontSize: "15px",
      stroke: "#101820",
      strokeThickness: 3,
    };
    this.life = this.scene.add
      .text(0, 0, "Life 0/0", style)
      .setDepth(HUD_DEPTH);
    this.distance = this.scene.add
      .text(0, 0, "Distance 0 m", style)
      .setDepth(HUD_DEPTH);
    this.coins = this.scene.add
      .text(0, 0, "Run coins 0", style)
      .setDepth(HUD_DEPTH);
    this.diagnostics = this.scene.add
      .text(0, 0, "FPS — | Level 1 | Speed 0 km/h | Seed", style)
      .setDepth(HUD_DEPTH);
    this.active = true;
  }

  public update(state: RunState, delta: number, root: HTMLElement): void {
    if (!this.active) return;
    const model = projectHud(state, this.fps.update(delta));
    this.life?.setText(`Life ${model.life}`);
    this.distance?.setText(`Distance ${model.distance}`);
    this.coins?.setText(`Run coins ${model.coins}`);
    this.diagnostics?.setText(
      `FPS ${model.fps} | Level ${model.level} | Speed ${model.speed} | Seed ${model.seed}`,
    );
    root.dataset.hudLife = model.life;
    root.dataset.hudDistance = model.distance;
    root.dataset.hudCoins = model.coins;
    root.dataset.hudFps = model.fps;
    root.dataset.hudLevel = model.level;
    root.dataset.hudSpeed = model.speed;
    root.dataset.hudSeed = model.fullSeed;
  }

  public applyLayout(layout: ViewportLayout): void {
    if (!this.active) return;
    this.fps.reset();
    const margin = 12;
    if (layout.orientation === "portrait") {
      this.life?.setPosition(margin, margin);
      this.distance?.setPosition(margin, 42);
      this.coins?.setPosition(margin, 72);
      this.diagnostics?.setPosition(margin, 112);
    } else {
      this.life?.setPosition(margin, margin);
      this.distance?.setPosition(160, margin);
      this.coins?.setPosition(330, margin);
      this.diagnostics?.setPosition(470, margin);
    }
  }

  public destroy(): void {
    if (!this.active) return;
    this.active = false;
    this.life?.destroy();
    this.distance?.destroy();
    this.coins?.destroy();
    this.diagnostics?.destroy();
    this.life = undefined;
    this.distance = undefined;
    this.coins = undefined;
    this.diagnostics = undefined;
    this.fps.reset();
  }
}
