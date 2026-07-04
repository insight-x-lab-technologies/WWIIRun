import { describe, expect, it } from "vitest";

import { InputActionBits } from "../../src/simulation/run";
import {
  CombinedInput,
  KeyboardInput,
  PointerInput,
} from "../../src/game/input";

describe("game input", () => {
  it("maps keyboard directions, cancellation and held actions", () => {
    const keyboard = new KeyboardInput();
    expect(keyboard.keyDown("ArrowLeft")).toBe(true);
    keyboard.keyDown("KeyD");
    keyboard.keyDown("Space");
    keyboard.keyDown("ShiftRight");
    keyboard.keyDown("KeyE");
    expect(keyboard.sample()).toEqual({ moveX: 0, moveY: 0, actions: 7 });
    keyboard.keyUp("KeyD");
    expect(keyboard.sample().moveX).toBe(-127);
    expect(keyboard.keyDown("Escape")).toBe(false);
  });

  it("quantizes relative movement and preserves pointer ownership", () => {
    const pointer = new PointerInput();
    pointer.configure({ x: 0, y: 0, width: 600, height: 400 }, 80);
    expect(pointer.pointerDown(1, 100, 100)).toBe(true);
    expect(pointer.pointerMove(2, 180, 20)).toBe(false);
    pointer.pointerMove(1, 109, 91);
    expect(pointer.sample()).toEqual({ moveX: 0, moveY: 0, actions: 0 });
    pointer.pointerMove(1, 180, 20);
    expect(pointer.sample()).toEqual({ moveX: 127, moveY: -127, actions: 0 });
    expect(pointer.pointerUp(2)).toBe(false);
    expect(pointer.pointerUp(1)).toBe(true);
    expect(pointer.sample().moveX).toBe(0);
  });

  it("supports movement plus action pointers and deterministic merge", () => {
    const keyboard = new KeyboardInput();
    const pointer = new PointerInput();
    pointer.configure({ x: 0, y: 0, width: 1000, height: 500 }, 100);
    pointer.setActionZone(InputActionBits.firePrimary, {
      x: 800,
      y: 0,
      width: 100,
      height: 100,
    });
    pointer.pointerDown(1, 100, 100);
    pointer.pointerMove(1, 150, 100);
    pointer.pointerDown(2, 850, 50);
    keyboard.keyDown("ArrowUp");
    keyboard.keyDown("Space");
    const combined = new CombinedInput(keyboard, pointer);
    const frame = combined.sample();
    expect(frame).toEqual({ moveX: 64, moveY: -127, actions: 1 });
    pointer.cancelAll();
    expect(combined.sample()).not.toBe(frame);
  });
});
