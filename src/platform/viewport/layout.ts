export type SafeAreaInsets = Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}>;
export type Rect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type ViewportLayout = Readonly<{
  orientation: "landscape" | "portrait";
  safeArea: Rect;
  logicalWidth: 960 | 540;
  logicalHeight: 540 | 960;
  world: Rect;
  scale: number;
  canvasCss: Rect;
}>;

export function calculateViewportLayout(
  width: number,
  height: number,
  insets: SafeAreaInsets,
): ViewportLayout {
  validatePositive("width", width);
  validatePositive("height", height);
  for (const [name, value] of Object.entries(insets))
    validateInset(name, value);
  const safeWidth = width - insets.left - insets.right;
  const safeHeight = height - insets.top - insets.bottom;
  if (safeWidth <= 0 || safeHeight <= 0)
    throw new TypeError("Safe area must have positive dimensions.");

  const landscape = safeWidth >= safeHeight;
  const logicalWidth = landscape ? 960 : 540;
  const logicalHeight = landscape ? 540 : 960;
  const scale = Math.min(safeWidth / logicalWidth, safeHeight / logicalHeight);
  const canvasWidth = logicalWidth * scale;
  const canvasHeight = logicalHeight * scale;
  return {
    orientation: landscape ? "landscape" : "portrait",
    safeArea: {
      x: insets.left,
      y: insets.top,
      width: safeWidth,
      height: safeHeight,
    },
    logicalWidth,
    logicalHeight,
    world: {
      x: 0,
      y: landscape ? 0 : 210,
      width: landscape ? 960 : 540,
      height: 540,
    },
    scale,
    canvasCss: {
      x: insets.left + (safeWidth - canvasWidth) / 2,
      y: insets.top + (safeHeight - canvasHeight) / 2,
      width: canvasWidth,
      height: canvasHeight,
    },
  };
}

function validatePositive(name: string, value: number): void {
  if (!Number.isFinite(value) || value <= 0)
    throw new TypeError(`${name} must be finite and positive.`);
}

function validateInset(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0)
    throw new TypeError(`${name} inset must be finite and non-negative.`);
}
