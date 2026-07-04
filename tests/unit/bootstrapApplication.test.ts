import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createGame } = vi.hoisted(() => ({ createGame: vi.fn() }));

vi.mock("../../src/game/createGame", () => ({ createGame }));

import { bootstrapApplication } from "../../src/app/bootstrapApplication";

describe("bootstrapApplication", () => {
  beforeEach(() => {
    vi.stubGlobal("HTMLElement", class HTMLElementStub {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects a missing root without creating Phaser", () => {
    expect(() => bootstrapApplication(null, { setRunActive: vi.fn() })).toThrow(
      "WWIIRun bootstrap failed: #game-root element was not found.",
    );
    expect(createGame).not.toHaveBeenCalled();
  });
});
