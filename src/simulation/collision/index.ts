export const COLLISION_COORDINATE_CAP = 16_000_000 as const;

export type Transform = { readonly x: number; readonly y: number };
export type AabbHitbox = {
  readonly kind: "aabb";
  readonly offsetX: number;
  readonly offsetY: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
};
export type CircleHitbox = {
  readonly kind: "circle";
  readonly offsetX: number;
  readonly offsetY: number;
  readonly radius: number;
};
export type Hitbox = AabbHitbox | CircleHitbox;
export type CompoundHitbox = readonly Hitbox[];

export function createCompoundHitbox(
  shapes: readonly Hitbox[],
): CompoundHitbox {
  if (shapes.length === 0) throw new RangeError("hitboxes must not be empty.");
  const copy = shapes.map((shape) => Object.freeze({ ...shape }));
  for (const shape of copy) validateHitbox(shape);
  return Object.freeze(copy);
}

export function intersectsPrimitive(
  aTransform: Transform,
  aShape: Hitbox,
  bTransform: Transform,
  bShape: Hitbox,
): boolean {
  if (aShape.kind === "aabb" && bShape.kind === "aabb") {
    const ax = aTransform.x + aShape.offsetX,
      ay = aTransform.y + aShape.offsetY;
    const bx = bTransform.x + bShape.offsetX,
      by = bTransform.y + bShape.offsetY;
    return (
      Math.abs(ax - bx) <= aShape.halfWidth + bShape.halfWidth &&
      Math.abs(ay - by) <= aShape.halfHeight + bShape.halfHeight
    );
  }
  if (aShape.kind === "circle" && bShape.kind === "circle") {
    const dx = aTransform.x + aShape.offsetX - bTransform.x - bShape.offsetX;
    const dy = aTransform.y + aShape.offsetY - bTransform.y - bShape.offsetY;
    const radius = aShape.radius + bShape.radius;
    return dx * dx + dy * dy <= radius * radius;
  }
  return aShape.kind === "circle"
    ? intersectsCircleAabb(aTransform, aShape, bTransform, bShape as AabbHitbox)
    : intersectsCircleAabb(
        bTransform,
        bShape as CircleHitbox,
        aTransform,
        aShape,
      );
}

export function intersectsCompound(
  aTransform: Transform,
  aShapes: CompoundHitbox,
  bTransform: Transform,
  bShapes: CompoundHitbox,
): boolean {
  for (const aShape of aShapes)
    for (const bShape of bShapes)
      if (intersectsPrimitive(aTransform, aShape, bTransform, bShape))
        return true;
  return false;
}

function intersectsCircleAabb(
  circleTransform: Transform,
  circle: CircleHitbox,
  boxTransform: Transform,
  box: AabbHitbox,
): boolean {
  const cx = circleTransform.x + circle.offsetX,
    cy = circleTransform.y + circle.offsetY;
  const bx = boxTransform.x + box.offsetX,
    by = boxTransform.y + box.offsetY;
  const nearestX = clamp(cx, bx - box.halfWidth, bx + box.halfWidth);
  const nearestY = clamp(cy, by - box.halfHeight, by + box.halfHeight);
  const dx = cx - nearestX,
    dy = cy - nearestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
}

function validateHitbox(shape: Hitbox): void {
  validateCoordinate(shape.offsetX, "offsetX");
  validateCoordinate(shape.offsetY, "offsetY");
  if (shape.kind === "aabb") {
    validateExtent(shape.halfWidth, "halfWidth");
    validateExtent(shape.halfHeight, "halfHeight");
  } else if (shape.kind === "circle") validateExtent(shape.radius, "radius");
  else throw new TypeError("hitbox.kind must be aabb or circle.");
}
function validateCoordinate(value: number, name: string): void {
  if (!Number.isInteger(value) || Math.abs(value) > COLLISION_COORDINATE_CAP)
    throw new RangeError(
      `${name} must be an integer within the collision cap.`,
    );
}
function validateExtent(value: number, name: string): void {
  if (
    !Number.isInteger(value) ||
    value <= 0 ||
    value > COLLISION_COORDINATE_CAP
  )
    throw new RangeError(
      `${name} must be a positive integer within the collision cap.`,
    );
}
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
