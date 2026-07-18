import Phaser from "phaser";

import type { GameplaySession } from "../app/GameplaySession";
import {
  calculateViewportLayout,
  type ViewportLayout,
} from "../platform/viewport/layout";
import { InputActionBits } from "../simulation/run";
import {
  PLACEHOLDER_AIRCRAFT,
  SIMULATION_UNITS_PER_LOGICAL_PIXEL,
} from "../simulation/aircraft";
import { CombinedInput, KeyboardInput, PointerInput } from "./input";
import {
  MAX_COINS,
  MAX_ENEMIES,
  MAX_PROJECTILES,
  MAX_STRUCTURES,
} from "../simulation/run";
import type { EntitySlot } from "../simulation/entities";
import {
  PARALLAX_LAYERS,
  PARALLAX_PATTERN_HEIGHT,
  parallaxOffsetForTick,
  parallaxTextureKey,
  resolveParallaxTexture,
  technicalPlaceholderInstructions,
  type ParallaxVisualResolver,
} from "./parallax";
import { GameplayHud } from "./hud";

export type GameplaySceneDependencies = {
  root: HTMLElement;
  session: GameplaySession;
  keyboard: KeyboardInput;
  pointer: PointerInput;
  combined: CombinedInput;
  diagnostics?: GameplaySceneDiagnostics;
  parallaxResolver?: ParallaxVisualResolver;
  onTerminalSnapshot?(
    state: ReturnType<GameplaySession["snapshot"]>["state"],
  ): void;
};

export type GameplaySceneDiagnostics = {
  readonly showHitboxes: boolean;
};

export const DEFAULT_GAMEPLAY_DIAGNOSTICS: GameplaySceneDiagnostics =
  Object.freeze({ showHitboxes: false });

export class GameplayScene extends Phaser.Scene {
  private aircraft: Phaser.GameObjects.Graphics | undefined;
  private hitboxOverlay: Phaser.GameObjects.Graphics | undefined;
  private hud: GameplayHud | undefined;
  private zones: Phaser.GameObjects.Graphics | undefined;
  private readonly entityGraphics: Phaser.GameObjects.Graphics[] = [];
  private readonly structureGraphics: Phaser.GameObjects.Graphics[] = [];
  private readonly parallaxLayers: Phaser.GameObjects.TileSprite[] = [];
  private readonly parallaxTextureKeys: string[] = [];
  private readonly entityPools: Array<readonly EntitySlot[]> = [];
  private layout?: ViewportLayout;
  private cleanup: Array<() => void> = [];
  private resizeFrame: number | undefined;
  private parallaxTick = 0;
  private active = false;
  private inputEnabled = true;
  private terminalObserved = false;
  public constructor(private readonly dependencies: GameplaySceneDependencies) {
    super("gameplay");
  }

  public create(): void {
    this.active = true;
    this.applyLayout();
    const world = this.layout?.world;
    if (world === undefined)
      throw new Error("Gameplay viewport was not initialized.");
    this.cameras.main.setBackgroundColor("#101820");
    this.createParallax();
    this.aircraft = this.drawAircraft();
    this.createEntityPool();
    if (
      (this.dependencies.diagnostics ?? DEFAULT_GAMEPLAY_DIAGNOSTICS)
        .showHitboxes
    )
      this.hitboxOverlay = this.drawHitboxes();
    this.hud = new GameplayHud(this);
    this.hud.create();
    this.dependencies.root.dataset.hudOverlayTextCount = String(
      this.hud.textCount(),
    );
    if (this.layout !== undefined) this.hud.applyLayout(this.layout);
    this.drawZones();
    this.bindEvents();
    this.dependencies.session.start();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.shutdown());
  }

  public override update(_time: number, delta: number): void {
    if (!this.active) return;
    this.dependencies.session.update(delta);
    const snapshot = this.dependencies.session.snapshot();
    if (
      !this.terminalObserved &&
      snapshot.state.player.status === "destroyed"
    ) {
      this.terminalObserved = true;
      this.inputEnabled = false;
      this.dependencies.combined.reset?.();
      this.dependencies.session.finish();
      this.dependencies.onTerminalSnapshot?.(snapshot.state);
    }
    const input = snapshot.state.input;
    const player = snapshot.state.player;
    this.parallaxTick = snapshot.state.tick;
    this.projectParallax();
    this.projectEntityPool(snapshot.state);
    if (this.aircraft !== undefined && this.layout !== undefined) {
      const x =
        this.layout.world.x +
        player.position.x / SIMULATION_UNITS_PER_LOGICAL_PIXEL;
      const y =
        this.layout.world.y +
        player.position.y / SIMULATION_UNITS_PER_LOGICAL_PIXEL;
      this.aircraft
        .setPosition(x, y)
        .setAlpha(player.status === "active" ? 1 : 0.35);
      this.hitboxOverlay?.setPosition(x, y);
    }
    this.hud?.update(snapshot.state, delta, this.dependencies.root);
    const status = this.dependencies.root.querySelector<HTMLElement>(
      "[data-gameplay-status]",
    );
    if (status !== null)
      status.textContent = `${snapshot.paused ? "Paused" : "Active"}; ${this.layout?.orientation ?? "unknown"}; tick ${snapshot.state.tick}`;
    this.dependencies.root.dataset.input = `${input.moveX},${input.moveY},${input.actions}`;
    this.dependencies.root.dataset.player = `${player.position.x},${player.position.y},${player.health.current},${player.status}`;
    this.dependencies.root.dataset.weaponCooldown = String(
      snapshot.state.primaryCooldownTicks,
    );
    const stats = snapshot.state.runStats;
    this.dependencies.root.dataset.runCoins = String(stats.runCoins);
    this.dependencies.root.dataset.coinsSpawned = String(stats.coinsSpawned);
    this.dependencies.root.dataset.coinsCollected = String(
      stats.coinsCollected,
    );
    this.dependencies.root.dataset.enemiesDestroyed = String(
      stats.enemiesDestroyed,
    );
  }

  private bindEvents(): void {
    const canvas = this.game.canvas;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (
        this.inputEnabled &&
        (document.activeElement === canvas ||
          document.activeElement === document.body)
      )
        if (this.dependencies.keyboard.keyDown(event.code))
          event.preventDefault();
    };
    const onKeyUp = (event: KeyboardEvent): void => {
      const handled =
        this.inputEnabled && this.dependencies.keyboard.keyUp(event.code);
      if (
        handled &&
        (document.activeElement === canvas ||
          document.activeElement === document.body)
      )
        event.preventDefault();
    };
    const onPointerDown = (event: PointerEvent): void => {
      const point = this.inputEnabled ? this.toLogical(event) : undefined;
      if (
        point !== undefined &&
        this.dependencies.pointer.pointerDown(event.pointerId, point.x, point.y)
      )
        canvas.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = (event: PointerEvent): void => {
      const point = this.inputEnabled ? this.toLogical(event) : undefined;
      if (point !== undefined)
        this.dependencies.pointer.pointerMove(
          event.pointerId,
          point.x,
          point.y,
        );
    };
    const onPointerEnd = (event: PointerEvent): void => {
      if (this.inputEnabled)
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
    this.layoutParallax();
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
    this.hud?.applyLayout(this.layout);
    this.hud?.reproject(this.dependencies.session.snapshot().state, root);
    if (this.zones !== undefined) this.drawZones();
  }

  private createParallax(): void {
    try {
      for (const layer of PARALLAX_LAYERS) {
        const textureKey = resolveParallaxTexture(
          layer,
          this.dependencies.parallaxResolver,
        );
        if (textureKey === parallaxTextureKey(layer))
          this.createPlaceholderTexture(layer, textureKey);
        const sprite = this.add
          .tileSprite(0, 0, 1, 1, textureKey)
          .setOrigin(0)
          .setDepth(layer.depth)
          .setTint(layer.placeholder.color)
          .setAlpha(layer.placeholder.alpha);
        this.parallaxLayers.push(sprite);
      }
      this.layoutParallax();
    } catch (error) {
      for (const sprite of this.parallaxLayers.splice(0)) sprite.destroy();
      for (const key of this.parallaxTextureKeys.splice(0))
        this.textures.remove(key);
      throw error;
    }
  }

  private createPlaceholderTexture(
    layer: (typeof PARALLAX_LAYERS)[number],
    textureKey: string,
  ): void {
    if (this.textures.exists(textureKey)) return;
    const graphics = this.add.graphics();
    try {
      graphics.fillStyle(0xffffff, 1);
      for (const instruction of technicalPlaceholderInstructions(layer)) {
        if (instruction.kind === "rect")
          graphics.fillRect(
            instruction.x,
            instruction.y,
            instruction.width,
            instruction.height,
          );
        else if (instruction.kind === "circle")
          graphics.fillCircle(instruction.x, instruction.y, instruction.radius);
        else
          graphics.fillTriangle(
            instruction.x1,
            instruction.y1,
            instruction.x2,
            instruction.y2,
            instruction.x3,
            instruction.y3,
          );
      }
      graphics.generateTexture(
        textureKey,
        layer.placeholder.period,
        PARALLAX_PATTERN_HEIGHT,
      );
      this.parallaxTextureKeys.push(textureKey);
    } finally {
      graphics.destroy();
    }
  }

  private layoutParallax(): void {
    if (this.layout === undefined || this.parallaxLayers.length === 0) return;
    for (let index = 0; index < PARALLAX_LAYERS.length; index += 1) {
      const definition = PARALLAX_LAYERS[index]!;
      const sprite = this.parallaxLayers[index]!;
      const width = this.layout.logicalWidth + definition.overscan * 2;
      sprite
        .setPosition(-definition.overscan, 0)
        .setSize(width, this.layout.logicalHeight);
    }
    this.projectParallax();
    this.dependencies.root.dataset.parallaxLayerCount = String(
      this.parallaxLayers.length,
    );
    this.dependencies.root.dataset.parallaxCoverage = `${this.layout.logicalWidth}x${this.layout.logicalHeight}`;
    this.dependencies.root.dataset.parallaxVisualIds = PARALLAX_LAYERS.map(
      (layer) => layer.visualId,
    ).join(",");
  }

  private projectParallax(): void {
    if (this.layout === undefined) return;
    for (let index = 0; index < PARALLAX_LAYERS.length; index += 1) {
      const definition = PARALLAX_LAYERS[index]!;
      const sprite = this.parallaxLayers[index];
      if (sprite === undefined) continue;
      sprite.tilePositionX = parallaxOffsetForTick(
        this.parallaxTick,
        definition,
        definition.placeholder.period,
      );
      sprite.tilePositionY = 0;
    }
  }

  private drawZones(): void {
    if (this.layout === undefined) return;
    const graphics = (this.zones ??= this.add.graphics().setDepth(2));
    graphics.clear();
    graphics.lineStyle(2, 0x65b5ff, 0.55);
    const size = 56 / this.layout.scale,
      gap = 12 / this.layout.scale;
    const right = this.layout.world.x + this.layout.world.width - size - gap;
    const bottom = this.layout.world.y + this.layout.world.height - size - gap;
    graphics
      .strokeRect(right, bottom, size, size)
      .strokeRect(right - size - gap, bottom, size, size)
      .strokeRect(right, bottom - size - gap, size, size);
    this.dependencies.root.dataset.zoneRenderOrientation =
      this.layout.orientation;
  }

  private drawAircraft(): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics().setDepth(3);
    graphics.fillStyle(0xd5a94e).fillRect(-22, -8, 44, 16);
    graphics.fillStyle(0x65b5ff).fillRect(-12, -20, 16, 40);
    graphics.fillStyle(0xf4f0e6).fillCircle(22, 0, 6);
    return graphics;
  }

  private createEntityPool(): void {
    const total = MAX_PROJECTILES + MAX_ENEMIES + MAX_COINS;
    for (let index = 0; index < total; index += 1) {
      const graphics = this.add.graphics().setDepth(3).setVisible(false);
      graphics.fillStyle(0x65b5ff).fillCircle(0, 0, 3);
      this.entityGraphics.push(graphics);
    }
    for (let index = 0; index < MAX_STRUCTURES * 4; index += 1)
      this.structureGraphics.push(
        this.add.graphics().setDepth(3).setVisible(false),
      );
  }

  private projectEntityPool(
    state: ReturnType<GameplaySession["snapshot"]>["state"],
  ): void {
    if (state.pools === undefined || state.broadPhase === undefined) return;
    let graphicsIndex = 0;
    this.entityPools[0] = state.pools.projectiles;
    this.entityPools[1] = state.pools.enemies;
    this.entityPools[2] = state.pools.coins;
    let activeEntities = 0;
    for (const slots of this.entityPools)
      for (const slot of slots) {
        const graphics = this.entityGraphics[graphicsIndex++];
        if (graphics === undefined) continue;
        if (!slot.active || this.layout === undefined) {
          graphics.setVisible(false);
          continue;
        }
        activeEntities += 1;
        graphics.clear();
        if (slot.definitionId === "enemy.scout.v1")
          graphics.fillStyle(0xe9b44c).fillTriangle(-8, 0, 8, -6, 8, 6);
        else if (slot.definitionId === "enemy.interceptor.v1")
          graphics.fillStyle(0xff5a5f).fillRect(-8, -4, 16, 8);
        else if (slot.definitionId === "projectile.placeholder.v1")
          graphics.fillStyle(0x65b5ff).fillRect(-4, -1, 8, 2);
        else graphics.fillStyle(0xf4f0e6).fillCircle(0, 0, 3);
        graphics
          .setPosition(
            this.layout.world.x +
              slot.position.x / SIMULATION_UNITS_PER_LOGICAL_PIXEL,
            this.layout.world.y +
              slot.position.y / SIMULATION_UNITS_PER_LOGICAL_PIXEL,
          )
          .setVisible(true);
      }
    let structureGraphicsIndex = 0;
    let activeStructures = 0;
    for (const structure of state.pools.structures)
      for (let moduleIndex = 0; moduleIndex < 4; moduleIndex += 1) {
        const graphics = this.structureGraphics[structureGraphicsIndex++]!;
        const module = structure.modules[moduleIndex]!;
        if (!structure.active || !module.active || this.layout === undefined) {
          graphics.setVisible(false);
          continue;
        }
        activeStructures += 1;
        graphics
          .clear()
          .fillStyle(
            module.health.current < module.health.max ? 0xe9b44c : 0x829ab1,
          )
          .fillRect(-8, -6, 16, 12);
        graphics
          .setPosition(
            this.layout.world.x +
              (structure.position.x + (moduleIndex - 1) * 4096) /
                SIMULATION_UNITS_PER_LOGICAL_PIXEL,
            this.layout.world.y +
              structure.position.y / SIMULATION_UNITS_PER_LOGICAL_PIXEL,
          )
          .setVisible(true);
      }
    this.dependencies.root.dataset.poolCapacity = String(
      this.entityGraphics.length + this.structureGraphics.length,
    );
    this.dependencies.root.dataset.activeEntities = String(activeEntities);
    this.dependencies.root.dataset.activeStructureModules =
      String(activeStructures);
    this.dependencies.root.dataset.broadPhaseCandidates = String(
      state.broadPhase.candidateCount,
    );
    this.dependencies.root.dataset.broadPhaseContacts = String(
      state.broadPhase.contactCount,
    );
    let enemyHealth = "";
    for (const slot of state.pools.enemies) {
      if (!slot.active) continue;
      enemyHealth += `${enemyHealth === "" ? "" : ","}${slot.health.current}/${slot.health.max}`;
    }
    this.dependencies.root.dataset.enemyHealth = enemyHealth;
  }

  private drawHitboxes(): Phaser.GameObjects.Graphics {
    const graphics = this.add.graphics().setDepth(4);
    graphics.lineStyle(1, 0xff5a5f, 0.75);
    for (const shape of PLACEHOLDER_AIRCRAFT.hitboxes) {
      if (shape.kind === "aabb")
        graphics.strokeRect(
          (shape.offsetX - shape.halfWidth) /
            SIMULATION_UNITS_PER_LOGICAL_PIXEL,
          (shape.offsetY - shape.halfHeight) /
            SIMULATION_UNITS_PER_LOGICAL_PIXEL,
          (shape.halfWidth * 2) / SIMULATION_UNITS_PER_LOGICAL_PIXEL,
          (shape.halfHeight * 2) / SIMULATION_UNITS_PER_LOGICAL_PIXEL,
        );
      else
        graphics.strokeCircle(
          shape.offsetX / SIMULATION_UNITS_PER_LOGICAL_PIXEL,
          shape.offsetY / SIMULATION_UNITS_PER_LOGICAL_PIXEL,
          shape.radius / SIMULATION_UNITS_PER_LOGICAL_PIXEL,
        );
    }
    return graphics;
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
    if (!this.active) return;
    this.active = false;
    if (this.resizeFrame !== undefined) cancelAnimationFrame(this.resizeFrame);
    this.resizeFrame = undefined;
    for (const cleanup of this.cleanup.splice(0)) cleanup();
    this.aircraft?.destroy();
    this.aircraft = undefined;
    this.hitboxOverlay?.destroy();
    this.hitboxOverlay = undefined;
    this.zones?.destroy();
    this.zones = undefined;
    for (const sprite of this.parallaxLayers.splice(0)) sprite.destroy();
    for (const key of this.parallaxTextureKeys.splice(0))
      this.textures.remove(key);
    for (const graphics of this.entityGraphics.splice(0)) graphics.destroy();
    for (const graphics of this.structureGraphics.splice(0)) graphics.destroy();
    this.hud?.destroy();
    this.hud = undefined;
    this.dependencies.session.destroy();
  }
}

function parseInset(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
