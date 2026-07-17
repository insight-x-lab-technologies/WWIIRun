import { describe, expect, test } from "vitest";

import {
  PARALLAX_LAYERS,
  parallaxOffsetForTick,
  parallaxTextureKey,
  resolveParallaxTexture,
  technicalPlaceholderInstructions,
  validateParallaxLayers,
} from "../../src/game/parallax";

describe("parallax presentation definitions", () => {
  test("freezes the four stable layers in drawing order", () => {
    expect(PARALLAX_LAYERS.map((layer) => layer.visualId)).toEqual([
      "background.sky.v1",
      "background.clouds.far.v1",
      "background.terrain.distant.v1",
      "background.terrain.mid.v1",
    ]);
    expect(PARALLAX_LAYERS.map((layer) => layer.assetSlot)).toEqual([
      "parallax.sky",
      "parallax.clouds.far",
      "parallax.terrain.distant",
      "parallax.terrain.mid",
    ]);
    expect(PARALLAX_LAYERS.map((layer) => layer.scrollPer100Ticks)).toEqual([
      0, 5, 15, 35,
    ]);
    expect(PARALLAX_LAYERS.map((layer) => layer.placeholder.period)).toEqual([
      256, 256, 384, 256,
    ]);
    expect(Object.isFrozen(PARALLAX_LAYERS)).toBe(true);
    expect(Object.isFrozen(PARALLAX_LAYERS[0]!)).toBe(true);
  });

  test("rejects partial, duplicate, unordered, and invalid definitions", () => {
    expect(() => validateParallaxLayers(PARALLAX_LAYERS.slice(0, 3))).toThrow(
      "exactly four",
    );
    expect(() =>
      validateParallaxLayers([
        ...PARALLAX_LAYERS.slice(0, 3),
        { ...PARALLAX_LAYERS[3]!, visualId: "background.sky.v1" },
      ]),
    ).toThrow("visual IDs");
    expect(() =>
      validateParallaxLayers([
        { ...PARALLAX_LAYERS[0]!, depth: -1 },
        ...PARALLAX_LAYERS.slice(1),
      ]),
    ).toThrow("depths");
  });
});

describe("parallax visual projection", () => {
  test("derives repeatable offsets only from tick, factor, and period", () => {
    const layer = PARALLAX_LAYERS[3]!;
    expect(parallaxOffsetForTick(0, layer, 960)).toBe(0);
    expect(parallaxOffsetForTick(100, layer, 960)).toBe(35);
    expect(parallaxOffsetForTick(2_800, layer, 960)).toBe(20);
    expect(parallaxOffsetForTick(2_800, layer, 960)).toBe(
      parallaxOffsetForTick(2_800, layer, 960),
    );
    expect(parallaxOffsetForTick(99_999, PARALLAX_LAYERS[0]!, 540)).toBe(0);
  });

  test("uses an optional cosmetic resolver without changing definitions", () => {
    const layer = PARALLAX_LAYERS[1]!;
    const resolver = (visualId: string, assetSlot: string) =>
      `${visualId}:${assetSlot}:future-atlas-frame`;
    expect(resolveParallaxTexture(layer)).toBe(parallaxTextureKey(layer));
    expect(resolveParallaxTexture(layer, resolver)).toBe(
      "background.clouds.far.v1:parallax.clouds.far:future-atlas-frame",
    );
    expect(layer.assetSlot).toBe("parallax.clouds.far");
  });

  test("materializes distinct repeatable instructions for each technical shape", () => {
    expect(technicalPlaceholderInstructions(PARALLAX_LAYERS[0]!)).toEqual([
      { kind: "rect", x: 0, y: 0, width: 256, height: 256 },
    ]);
    expect(
      technicalPlaceholderInstructions(PARALLAX_LAYERS[1]!).map(
        (instruction) => instruction.kind,
      ),
    ).toEqual(["circle", "circle", "circle", "rect"]);
    expect(
      technicalPlaceholderInstructions(PARALLAX_LAYERS[2]!).map(
        (instruction) => instruction.kind,
      ),
    ).toEqual(["rect", "triangle"]);
  });
});
