import Phaser from "phaser";

import type { ViewportLayout } from "../platform/viewport/layout";
import type { RunState } from "../simulation/run";
import {
  projectHud,
  RenderFpsWindow,
  type HudViewModel,
} from "./hudProjection";

const HUD_DEPTH = 8;

export class GameplayHud {
  private readonly fps = new RenderFpsWindow();
  private life: Phaser.GameObjects.Text | undefined;
  private distance: Phaser.GameObjects.Text | undefined;
  private coins: Phaser.GameObjects.Text | undefined;
  private diagnostics: Phaser.GameObjects.Text | undefined;
  private active = false;
  private fpsValue = "—";

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
    this.fpsValue = this.fps.update(delta);
    this.publish(projectHud(state, this.fpsValue), root);
  }

  public reproject(state: RunState, root: HTMLElement): void {
    if (!this.active) return;
    this.publish(projectHud(state, this.fpsValue), root);
  }

  public textCount(): number {
    return this.active ? 4 : 0;
  }

  private publish(model: HudViewModel, root: HTMLElement): void {
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
    this.fpsValue = "—";
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
    this.fpsValue = "—";
  }
}
