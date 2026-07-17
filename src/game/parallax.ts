export type ParallaxPlaceholder = Readonly<{
  color: number;
  alpha: number;
  shape: "solid" | "clouds" | "terrain";
  period: number;
}>;

export type PlaceholderInstruction =
  | Readonly<{
      kind: "rect";
      x: number;
      y: number;
      width: number;
      height: number;
    }>
  | Readonly<{ kind: "circle"; x: number; y: number; radius: number }>
  | Readonly<{
      kind: "triangle";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      x3: number;
      y3: number;
    }>;

export const PARALLAX_PATTERN_HEIGHT = 256;

export type ParallaxLayerDefinition = Readonly<{
  visualId: string;
  assetSlot: string;
  depth: number;
  scrollPer100Ticks: number;
  repeatsHorizontally: boolean;
  overscan: number;
  placeholder: ParallaxPlaceholder;
}>;

export const PARALLAX_LAYERS: readonly ParallaxLayerDefinition[] =
  Object.freeze([
    Object.freeze({
      visualId: "background.sky.v1",
      assetSlot: "parallax.sky",
      depth: -4,
      scrollPer100Ticks: 0,
      repeatsHorizontally: false,
      overscan: 0,
      placeholder: Object.freeze({
        color: 0x101820,
        alpha: 1,
        shape: "solid",
        period: 256,
      }),
    }),
    Object.freeze({
      visualId: "background.clouds.far.v1",
      assetSlot: "parallax.clouds.far",
      depth: -3,
      scrollPer100Ticks: 5,
      repeatsHorizontally: true,
      overscan: 64,
      placeholder: Object.freeze({
        color: 0x829ab1,
        alpha: 0.35,
        shape: "clouds",
        period: 256,
      }),
    }),
    Object.freeze({
      visualId: "background.terrain.distant.v1",
      assetSlot: "parallax.terrain.distant",
      depth: -2,
      scrollPer100Ticks: 15,
      repeatsHorizontally: true,
      overscan: 96,
      placeholder: Object.freeze({
        color: 0x426a5a,
        alpha: 0.75,
        shape: "terrain",
        period: 384,
      }),
    }),
    Object.freeze({
      visualId: "background.terrain.mid.v1",
      assetSlot: "parallax.terrain.mid",
      depth: -1,
      scrollPer100Ticks: 35,
      repeatsHorizontally: true,
      overscan: 128,
      placeholder: Object.freeze({
        color: 0x263d35,
        alpha: 0.95,
        shape: "terrain",
        period: 256,
      }),
    }),
  ]);

export type ParallaxVisualResolver = (
  visualId: string,
  assetSlot: string,
) => string | undefined;

export function validateParallaxLayers(
  layers: readonly ParallaxLayerDefinition[],
): void {
  if (layers.length !== 4)
    throw new TypeError("Parallax requires exactly four layers.");
  let previousDepth = Number.NEGATIVE_INFINITY;
  const visualIds = new Set<string>();
  const assetSlots = new Set<string>();
  for (const layer of layers) {
    if (!layer.visualId || visualIds.has(layer.visualId))
      throw new TypeError("Parallax visual IDs must be unique and non-empty.");
    if (!layer.assetSlot || assetSlots.has(layer.assetSlot))
      throw new TypeError("Parallax asset slots must be unique and non-empty.");
    if (!Number.isSafeInteger(layer.depth) || layer.depth <= previousDepth)
      throw new TypeError(
        "Parallax depths must be strictly increasing integers.",
      );
    if (
      !Number.isSafeInteger(layer.scrollPer100Ticks) ||
      layer.scrollPer100Ticks < 0 ||
      !Number.isSafeInteger(layer.overscan) ||
      layer.overscan < 0
    )
      throw new TypeError(
        "Parallax motion and overscan must be non-negative integers.",
      );
    if (!layer.repeatsHorizontally && layer.scrollPer100Ticks !== 0)
      throw new TypeError("A fixed parallax layer cannot scroll.");
    if (
      !Number.isInteger(layer.placeholder.color) ||
      layer.placeholder.color < 0 ||
      layer.placeholder.color > 0xffffff ||
      !Number.isFinite(layer.placeholder.alpha) ||
      layer.placeholder.alpha < 0 ||
      layer.placeholder.alpha > 1 ||
      !Number.isSafeInteger(layer.placeholder.period) ||
      layer.placeholder.period <= 0
    )
      throw new TypeError("Parallax placeholder color and alpha are invalid.");
    visualIds.add(layer.visualId);
    assetSlots.add(layer.assetSlot);
    previousDepth = layer.depth;
  }
}

export function parallaxOffsetForTick(
  tick: number,
  layer: Pick<ParallaxLayerDefinition, "scrollPer100Ticks">,
  period: number,
): number {
  if (!Number.isSafeInteger(tick) || tick < 0)
    throw new TypeError("Parallax tick must be a non-negative safe integer.");
  if (!Number.isSafeInteger(period) || period <= 0)
    throw new TypeError("Parallax period must be a positive safe integer.");
  const units = Math.floor((tick * layer.scrollPer100Ticks) / 100);
  return units % period;
}

export function resolveParallaxTexture(
  layer: ParallaxLayerDefinition,
  resolver?: ParallaxVisualResolver,
): string {
  return (
    resolver?.(layer.visualId, layer.assetSlot) ?? parallaxTextureKey(layer)
  );
}

export function parallaxTextureKey(layer: ParallaxLayerDefinition): string {
  return `parallax.placeholder.${layer.visualId}`;
}

export function technicalPlaceholderInstructions(
  layer: ParallaxLayerDefinition,
): readonly PlaceholderInstruction[] {
  const period = layer.placeholder.period;
  if (layer.placeholder.shape === "solid")
    return [
      {
        kind: "rect",
        x: 0,
        y: 0,
        width: period,
        height: PARALLAX_PATTERN_HEIGHT,
      },
    ];
  if (layer.placeholder.shape === "clouds")
    return [
      { kind: "circle", x: 40, y: 72, radius: 28 },
      { kind: "circle", x: 78, y: 56, radius: 36 },
      { kind: "circle", x: 126, y: 76, radius: 30 },
      { kind: "rect", x: 0, y: 76, width: period, height: 42 },
    ];
  return [
    {
      kind: "rect",
      x: 0,
      y: PARALLAX_PATTERN_HEIGHT - 80,
      width: period,
      height: 80,
    },
    {
      kind: "triangle",
      x1: 0,
      y1: PARALLAX_PATTERN_HEIGHT - 80,
      x2: Math.floor(period / 2),
      y2: Math.floor(PARALLAX_PATTERN_HEIGHT / 2),
      x3: period,
      y3: PARALLAX_PATTERN_HEIGHT - 80,
    },
  ];
}

validateParallaxLayers(PARALLAX_LAYERS);
