import { describe, expect, it, vi } from "vitest";

import { hashRunState } from "../../src/simulation/run";
import { GameplaySession } from "../../src/app/GameplaySession";
import {
  CombinedInput,
  KeyboardInput,
  PointerInput,
} from "../../src/game/input";

const neutral = { moveX: 0, moveY: 0, actions: 0 } as const;

describe("GameplaySession", () => {
  it("advances identical ticks for equivalent render chunkings", () => {
    const a = new GameplaySession(
      { sample: () => neutral },
      { setRunActive: vi.fn() },
    );
    const b = new GameplaySession(
      { sample: () => neutral },
      { setRunActive: vi.fn() },
    );
    a.start();
    b.start();
    a.update(50);
    b.update(10);
    b.update(20);
    b.update(20);
    expect(a.snapshot().state.tick).toBe(3);
    expect(hashRunState(a.snapshot().state)).toBe(
      hashRunState(b.snapshot().state),
    );
  });

  it("caps backlog, reports dropped time, and rejects invalid delta", () => {
    const session = new GameplaySession(
      { sample: () => neutral },
      { setRunActive: vi.fn() },
    );
    session.start();
    expect(session.update(1000)).toMatchObject({ ticks: 5, dropped: true });
    expect(session.snapshot().state.tick).toBe(5);
    expect(() => session.update(Number.NaN)).toThrow(RangeError);
    expect(() => session.update(-1)).toThrow(RangeError);
  });

  it("pauses without catch-up, resumes neutral, and owns PWA lifecycle", () => {
    let input = { moveX: 127, moveY: 0, actions: 1 };
    const reset = vi.fn(() => {
      input = { moveX: 0, moveY: 0, actions: 0 };
    });
    const lifecycle = { setRunActive: vi.fn() };
    const session = new GameplaySession(
      { sample: () => ({ ...input }), reset },
      lifecycle,
    );
    session.start();
    session.pause("visibility");
    session.update(1000);
    session.resume("visibility");
    session.update(1000 / 60);
    expect(session.snapshot().state.input).toEqual(neutral);
    expect(reset).toHaveBeenCalled();
    session.destroy();
    session.destroy();
    expect(lifecycle.setRunActive.mock.calls).toEqual([[true], [false]]);
    expect(() => session.update(1)).toThrow("destroyed");
  });

  it("releases lifecycle idempotently across five create/destroy cycles", () => {
    const lifecycle = { setRunActive: vi.fn() };
    for (let cycle = 0; cycle < 5; cycle += 1) {
      const session = new GameplaySession({ sample: () => neutral }, lifecycle);
      session.start();
      session.destroy();
      session.destroy();
    }
    expect(
      lifecycle.setRunActive.mock.calls.filter(([active]) => active),
    ).toHaveLength(5);
    expect(
      lifecycle.setRunActive.mock.calls.filter(([active]) => !active),
    ).toHaveLength(5);
  });

  it("reuses one input frame allocation across production ticks", () => {
    const targets = new Set<object>();
    const session = new GameplaySession(
      {
        sample: () => {
          throw new Error("allocating sample path must not be used");
        },
        sampleInto: (target) => {
          targets.add(target);
          target.moveX = 0;
          target.moveY = 0;
          target.actions = 0;
          return target;
        },
      },
      { setRunActive: vi.fn() },
    );
    session.start();
    session.update(5 * (1000 / 60));

    expect(targets.size).toBe(1);
    expect(session.snapshot().state.tick).toBe(5);
  });

  it("reuses hot-path storage after warm-up across the complete production tick", () => {
    const keyboard = new KeyboardInput();
    const pointer = new PointerInput();
    const input = new CombinedInput(keyboard, pointer);
    const session = new GameplaySession(input, { setRunActive: vi.fn() });
    session.start();
    keyboard.keyDown("ArrowRight");

    const warmResult = session.update(1000 / 60);
    const measuredResults = new Set<object>();
    for (let frame = 0; frame < 120; frame += 1)
      measuredResults.add(session.update(1000 / 60));

    expect(measuredResults.size).toBe(1);
    expect(measuredResults.has(warmResult)).toBe(true);
    expect(warmResult).toEqual({ ticks: 1, dropped: false });
    expect(session.snapshot().state).toMatchObject({
      tick: 121,
      input: { moveX: 127, moveY: 0, actions: 0 },
    });
  });

  it("offers an opt-in diagnostic coin without bypassing the simulation", () => {
    const session = new GameplaySession(
      { sample: () => ({ moveX: 127, moveY: 0, actions: 0 }) },
      { setRunActive: vi.fn() },
    );
    session.activateDiagnosticCoin(49_152, 69_120);
    session.start();
    for (let tick = 0; tick < 50; tick += 1) {
      session.update(1000 / 60);
    }
    expect(session.snapshot().state.runStats).toEqual({
      runCoins: 1,
      coinsSpawned: 0,
      coinsCollected: 1,
      enemiesDestroyed: 0,
    });
  });
});
