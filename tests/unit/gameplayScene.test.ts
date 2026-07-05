import { describe, expect, test, vi } from "vitest";

vi.mock("phaser", () => ({
  default: {
    Scene: class Scene {
      public constructor() {}
    },
    Scenes: { Events: { SHUTDOWN: "shutdown", DESTROY: "destroy" } },
  },
}));

import {
  DEFAULT_GAMEPLAY_DIAGNOSTICS,
  GameplayScene,
  type GameplaySceneDependencies,
} from "../../src/game/GameplayScene";

describe("GameplayScene resources", () => {
  test("defaults the hitbox overlay off and enables it only through diagnostics", () => {
    expect(DEFAULT_GAMEPLAY_DIAGNOSTICS).toEqual({ showHitboxes: false });
    const disabled = createHarness(false);
    disabled.scene.create();
    expect(disabled.graphics.created).toBe(2);
    disabled.shutdown();
    const enabled = createHarness(true);
    enabled.scene.create();
    expect(enabled.graphics.created).toBe(3);
    enabled.shutdown();
  });

  test("releases graphics, text, listeners, callbacks and ignores update after five shutdowns", () => {
    for (let cycle = 0; cycle < 5; cycle += 1) {
      const harness = createHarness(true);
      harness.scene.create();
      harness.scene.update(0, 1000 / 60);
      expect(harness.listeners.active()).toBe(10);
      harness.shutdown();
      harness.scene.update(0, 1000 / 60);
      expect(harness.graphics).toEqual({ created: 3, destroyed: 3 });
      expect(harness.text).toEqual({ created: 1, destroyed: 1 });
      expect(harness.listeners.active()).toBe(0);
      expect(harness.session.update).toHaveBeenCalledTimes(1);
      expect(harness.events.pending()).toBe(0);
    }
  });
});

function createHarness(showHitboxes: boolean) {
  const graphics = { created: 0, destroyed: 0 };
  const text = { created: 0, destroyed: 0 };
  const listeners = listenerRegistry();
  const events = eventRegistry();
  const status = { textContent: "" };
  const root = {
    clientWidth: 320,
    clientHeight: 568,
    dataset: {} as Record<string, string>,
    querySelector: () => status,
  };
  const canvas = {
    style: {},
    addEventListener: listeners.add,
    removeEventListener: listeners.remove,
    getBoundingClientRect: () => ({ width: 320, height: 568, left: 0, top: 0 }),
  };
  vi.stubGlobal("getComputedStyle", () => ({
    paddingTop: "0",
    paddingRight: "0",
    paddingBottom: "0",
    paddingLeft: "0",
  }));
  vi.stubGlobal("window", {
    addEventListener: listeners.add,
    removeEventListener: listeners.remove,
  });
  vi.stubGlobal("document", {
    hidden: false,
    body: {},
    activeElement: canvas,
    addEventListener: listeners.add,
    removeEventListener: listeners.remove,
  });
  const session = {
    start: vi.fn(),
    update: vi.fn(() => ({ ticks: 1, dropped: false })),
    snapshot: vi.fn(() => ({
      paused: false,
      state: {
        tick: 1,
        input: { moveX: 0, moveY: 0, actions: 0 },
        player: {
          position: { x: 40960, y: 69120 },
          health: { current: 100, max: 100 },
          status: "active",
        },
      },
    })),
    pause: vi.fn(),
    resume: vi.fn(),
    destroy: vi.fn(),
  };
  const dependencies = {
    root,
    session,
    keyboard: { keyDown: vi.fn(), keyUp: vi.fn() },
    pointer: {
      configure: vi.fn(),
      setActionZone: vi.fn(),
      pointerDown: vi.fn(),
      pointerMove: vi.fn(),
      pointerUp: vi.fn(),
    },
    combined: {},
    diagnostics: { showHitboxes },
  } as unknown as GameplaySceneDependencies;
  const scene = new GameplayScene(dependencies);
  Object.defineProperties(scene, {
    add: {
      value: {
        graphics: () => makeResource(graphics),
        text: () => makeResource(text),
      },
    },
    cameras: {
      value: { main: { setBackgroundColor: vi.fn(), setViewport: vi.fn() } },
    },
    game: { value: { canvas } },
    scale: { value: { resize: vi.fn() } },
    events: { value: events },
  });
  return {
    scene,
    graphics,
    text,
    listeners,
    events,
    session,
    shutdown: () => events.emitAll(),
  };
}

function makeResource(counter: { created: number; destroyed: number }) {
  counter.created += 1;
  const target: Record<PropertyKey, unknown> = {
    destroy: () => {
      counter.destroyed += 1;
    },
  };
  const resource = new Proxy(target, {
    get(target, property) {
      if (property in target) return target[property];
      return () => resource;
    },
  });
  return resource;
}

function listenerRegistry() {
  const entries = new Set<string>();
  return {
    add: (name: string) => entries.add(name),
    remove: (name: string) => entries.delete(name),
    active: () => entries.size,
  };
}

function eventRegistry() {
  const callbacks: Array<() => void> = [];
  return {
    once: (_name: string, callback: () => void) => callbacks.push(callback),
    emitAll: () => {
      for (const callback of callbacks.splice(0)) callback();
    },
    pending: () => callbacks.length,
  };
}
