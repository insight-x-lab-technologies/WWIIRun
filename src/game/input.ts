import { InputActionBits, type InputFrame } from "../simulation/run";
import type { Rect } from "../platform/viewport/layout";

export interface InputSource {
  sample(): InputFrame;
  reset?(): void;
}

const KEY_MAP = new Map<string, readonly ["x" | "y" | "action", number]>([
  ["ArrowLeft", ["x", -1]],
  ["KeyA", ["x", -1]],
  ["ArrowRight", ["x", 1]],
  ["KeyD", ["x", 1]],
  ["ArrowUp", ["y", -1]],
  ["KeyW", ["y", -1]],
  ["ArrowDown", ["y", 1]],
  ["KeyS", ["y", 1]],
  ["Space", ["action", InputActionBits.firePrimary]],
  ["ShiftLeft", ["action", InputActionBits.fireSecondary]],
  ["ShiftRight", ["action", InputActionBits.fireSecondary]],
  ["KeyE", ["action", InputActionBits.special]],
]);

export class KeyboardInput implements InputSource {
  private readonly pressed = new Set<string>();
  keyDown(code: string): boolean {
    if (!KEY_MAP.has(code)) return false;
    this.pressed.add(code);
    return true;
  }
  keyUp(code: string): boolean {
    if (!KEY_MAP.has(code)) return false;
    this.pressed.delete(code);
    return true;
  }
  reset(): void {
    this.pressed.clear();
  }
  sample(): InputFrame {
    let x = 0,
      y = 0,
      actions = 0;
    for (const code of this.pressed) {
      const mapping = KEY_MAP.get(code);
      if (mapping?.[0] === "x") x += mapping[1];
      else if (mapping?.[0] === "y") y += mapping[1];
      else if (mapping !== undefined) actions |= mapping[1];
    }
    return { moveX: Math.sign(x) * 127, moveY: Math.sign(y) * 127, actions };
  }
}

type ActionCapture = { bit: number; pointerId: number };
export class PointerInput implements InputSource {
  private world?: Rect;
  private radius = 1;
  private movement:
    | {
        pointerId: number;
        originX: number;
        originY: number;
        x: number;
        y: number;
      }
    | undefined;
  private readonly actionZones = new Map<number, Rect>();
  private readonly actions = new Map<number, ActionCapture>();
  configure(world: Rect, radius: number): void {
    this.world = world;
    this.radius = radius;
    this.cancelAll();
  }
  setActionZone(bit: number, rect: Rect): void {
    this.actionZones.set(bit, rect);
  }
  pointerDown(pointerId: number, x: number, y: number): boolean {
    if (this.world === undefined) return false;
    for (const [bit, zone] of this.actionZones) {
      if (contains(zone, x, y) && !this.actions.has(bit)) {
        this.actions.set(bit, { bit, pointerId });
        return true;
      }
    }
    const movementZone = { ...this.world, width: this.world.width * 0.6 };
    if (this.movement === undefined && contains(movementZone, x, y)) {
      this.movement = { pointerId, originX: x, originY: y, x, y };
      return true;
    }
    return false;
  }
  pointerMove(pointerId: number, x: number, y: number): boolean {
    if (this.movement?.pointerId !== pointerId) return false;
    this.movement.x = x;
    this.movement.y = y;
    return true;
  }
  pointerUp(pointerId: number): boolean {
    let released = false;
    if (this.movement?.pointerId === pointerId) {
      this.movement = undefined;
      released = true;
    }
    for (const [bit, capture] of this.actions)
      if (capture.pointerId === pointerId) {
        this.actions.delete(bit);
        released = true;
      }
    return released;
  }
  cancelAll(): void {
    this.movement = undefined;
    this.actions.clear();
  }
  reset(): void {
    this.cancelAll();
  }
  sample(): InputFrame {
    let moveX = 0,
      moveY = 0,
      actions = 0;
    if (this.movement !== undefined) {
      moveX = quantize(this.movement.x - this.movement.originX, this.radius);
      moveY = quantize(this.movement.y - this.movement.originY, this.radius);
    }
    for (const capture of this.actions.values()) actions |= capture.bit;
    return { moveX, moveY, actions };
  }
}

export class CombinedInput implements InputSource {
  public constructor(
    private readonly keyboard: KeyboardInput,
    private readonly pointer: PointerInput,
  ) {}
  sample(): InputFrame {
    const keyboard = this.keyboard.sample();
    const pointer = this.pointer.sample();
    return {
      moveX: chooseAxis(keyboard.moveX, pointer.moveX),
      moveY: chooseAxis(keyboard.moveY, pointer.moveY),
      actions: keyboard.actions | pointer.actions,
    };
  }
  reset(): void {
    this.keyboard.reset();
    this.pointer.reset();
  }
}

function quantize(delta: number, radius: number): number {
  if (Math.abs(delta) < radius * 0.12) return 0;
  return Math.round(Math.max(-1, Math.min(1, delta / radius)) * 127);
}
function chooseAxis(keyboard: number, pointer: number): number {
  return Math.abs(keyboard) >= Math.abs(pointer) ? keyboard : pointer;
}
function contains(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height
  );
}
