import Phaser from "phaser";

import type { GameplaySession } from "../app/GameplaySession";
import {
  calculateViewportLayout,
  type ViewportLayout,
} from "../platform/viewport/layout";
import { InputActionBits } from "../simulation/run";
import { CombinedInput, KeyboardInput, PointerInput } from "./input";

export type GameplaySceneDependencies = {
  root: HTMLElement;
  session: GameplaySession;
  keyboard: KeyboardInput;
  pointer: PointerInput;
  combined: CombinedInput;
};

export class GameplayScene extends Phaser.Scene {
  private marker?: Phaser.GameObjects.Arc;
  private diagnostic?: Phaser.GameObjects.Text;
  private layout?: ViewportLayout;
  private cleanup: Array<() => void> = [];
  private resizeFrame: number | undefined;
  public constructor(private readonly dependencies: GameplaySceneDependencies) {
    super("gameplay");
  }

  public create(): void {
    this.applyLayout();
    const world = this.layout?.world;
    if (world === undefined)
      throw new Error("Gameplay viewport was not initialized.");
    this.cameras.main.setBackgroundColor("#101820");
    this.marker = this.add.circle(
      world.x + world.width / 2,
      world.y + world.height / 2,
      18,
      0xd5a94e,
    );
    this.marker.setStrokeStyle(3, 0xf4f0e6);
    this.diagnostic = this.add
      .text(12, 12, "Gameplay tick 0 | input 0,0,0", {
        color: "#f4f0e6",
        fontFamily: "system-ui, sans-serif",
        fontSize: "16px",
      })
      .setDepth(10);
    this.drawZones();
    this.bindEvents();
    this.dependencies.session.start();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.shutdown());
  }

  public override update(_time: number, delta: number): void {
    const result = this.dependencies.session.update(delta);
    const snapshot = this.dependencies.session.snapshot();
    const input = snapshot.state.input;
    if (this.marker !== undefined && this.layout !== undefined) {
      const centerX = this.layout.world.x + this.layout.world.width / 2;
      const centerY = this.layout.world.y + this.layout.world.height / 2;
      this.marker.setPosition(
        centerX + input.moveX * 0.35,
        centerY + input.moveY * 0.35,
      );
      this.marker.setFillStyle(input.actions === 0 ? 0xd5a94e : 0x65b5ff);
    }
    this.diagnostic?.setText(
      `Gameplay tick ${snapshot.state.tick} | input ${input.moveX},${input.moveY},${input.actions}${result.dropped ? " | backlog dropped" : ""}`,
    );
    const status = this.dependencies.root.querySelector<HTMLElement>(
      "[data-gameplay-status]",
    );
    if (status !== null)
      status.textContent = `${snapshot.paused ? "Paused" : "Active"}; ${this.layout?.orientation ?? "unknown"}; tick ${snapshot.state.tick}`;
    this.dependencies.root.dataset.input = `${input.moveX},${input.moveY},${input.actions}`;
  }

  private bindEvents(): void {
    const canvas = this.game.canvas;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        document.activeElement === canvas ||
        document.activeElement === document.body
      )
        if (this.dependencies.keyboard.keyDown(event.code))
          event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      if (this.dependencies.keyboard.keyUp(event.code)) event.preventDefault();
    };
    const onPointerDown = (event: PointerEvent): void => {
      const point = this.toLogical(event);
      if (
        point !== undefined &&
        this.dependencies.pointer.pointerDown(event.pointerId, point.x, point.y)
      )
        canvas.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent): void => {
      const point = this.toLogical(event);
      if (point !== undefined)
        this.dependencies.pointer.pointerMove(
          event.pointerId,
          point.x,
          point.y,
        );
    };
    const onPointerEnd = (event: PointerEvent): void => {
      this.dependencies.pointer.pointerUp(event.pointerId);
    };
    const onVisibility = (): void =>
      document.hidden
        ? this.dependencies.session.pause("visibility")
        : this.dependencies.session.resume("visibility");
    const onBlur = (): void => this.dependencies.session.pause("focus");
    const onFocus = (): void => this.dependencies.session.resume("focus");
    const onResize = (): void => this.scheduleResize();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerEnd);
    canvas.addEventListener("pointercancel", onPointerEnd);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    window.addEventListener("resize", onResize);
    this.cleanup.push(
      () => window.removeEventListener("keydown", onKeyDown),
      () => window.removeEventListener("keyup", onKeyUp),
      () => canvas.removeEventListener("pointerdown", onPointerDown),
      () => canvas.removeEventListener("pointermove", onPointerMove),
      () => canvas.removeEventListener("pointerup", onPointerEnd),
      () => canvas.removeEventListener("pointercancel", onPointerEnd),
      () => document.removeEventListener("visibilitychange", onVisibility),
      () => window.removeEventListener("blur", onBlur),
      () => window.removeEventListener("focus", onFocus),
      () => window.removeEventListener("resize", onResize),
    );
  }

  private applyLayout(): void {
    const root = this.dependencies.root;
    const style = getComputedStyle(root);
    const insets = {
      top: parseInset(style.paddingTop),
      right: parseInset(style.paddingRight),
      bottom: parseInset(style.paddingBottom),
      left: parseInset(style.paddingLeft),
    };
    this.layout = calculateViewportLayout(
      root.clientWidth,
      root.clientHeight,
      insets,
    );
    this.scale.resize(this.layout.logicalWidth, this.layout.logicalHeight);
    const canvasStyle = this.game.canvas.style;
    Object.assign(canvasStyle, {
      position: "absolute",
      left: `${this.layout.canvasCss.x}px`,
      top: `${this.layout.canvasCss.y}px`,
      width: `${this.layout.canvasCss.width}px`,
      height: `${this.layout.canvasCss.height}px`,
    });
    this.cameras.main.setViewport(
      0,
      0,
      this.layout.logicalWidth,
      this.layout.logicalHeight,
    );
    const radiusCss = Math.min(
      96,
      Math.min(this.layout.safeArea.width, this.layout.safeArea.height) * 0.25,
    );
    this.dependencies.pointer.configure(
      this.layout.world,
      radiusCss / this.layout.scale,
    );
    const size = 56 / this.layout.scale;
    const gap = 12 / this.layout.scale;
    const right = this.layout.world.x + this.layout.world.width - size - gap;
    const bottom = this.layout.world.y + this.layout.world.height - size - gap;
    this.dependencies.pointer.setActionZone(InputActionBits.firePrimary, {
      x: right,
      y: bottom,
      width: size,
      height: size,
    });
    this.dependencies.pointer.setActionZone(InputActionBits.fireSecondary, {
      x: right - size - gap,
      y: bottom,
      width: size,
      height: size,
    });
    this.dependencies.pointer.setActionZone(InputActionBits.special, {
      x: right,
      y: bottom - size - gap,
      width: size,
      height: size,
    });
    root.dataset.orientation = this.layout.orientation;
  }

  private drawZones(): void {
    if (this.layout === undefined) return;
    const graphics = this.add.graphics().setDepth(2);
    graphics.lineStyle(2, 0x65b5ff, 0.55);
    const size = 56 / this.layout.scale,
      gap = 12 / this.layout.scale;
    const right = this.layout.world.x + this.layout.world.width - size - gap;
    const bottom = this.layout.world.y + this.layout.world.height - size - gap;
    graphics
      .strokeRect(right, bottom, size, size)
      .strokeRect(right - size - gap, bottom, size, size)
      .strokeRect(right, bottom - size - gap, size, size);
  }

  private scheduleResize(): void {
    this.dependencies.session.pause("viewport-change");
    if (this.resizeFrame !== undefined) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = undefined;
      this.applyLayout();
      this.dependencies.session.resume("viewport-change");
    });
  }
  private toLogical(event: PointerEvent): { x: number; y: number } | undefined {
    const rect = this.game.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || this.layout === undefined)
      return undefined;
    return {
      x: ((event.clientX - rect.left) * this.layout.logicalWidth) / rect.width,
      y: ((event.clientY - rect.top) * this.layout.logicalHeight) / rect.height,
    };
  }
  private shutdown(): void {
    if (this.resizeFrame !== undefined) cancelAnimationFrame(this.resizeFrame);
    for (const cleanup of this.cleanup.splice(0)) cleanup();
    this.dependencies.session.destroy();
  }
}

function parseInset(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
