export const PARALLAX_LAYER_COUNT = 3 as const;
export const WORKLOAD_IMAGE_COUNT = 1_200 as const;

export interface WorkloadPosition {
  readonly x: number;
  readonly y: number;
  readonly rotationMilliDegrees: number;
}

export function workloadPosition(
  index: number,
  tick: number,
  width: number,
  height: number,
): WorkloadPosition {
  const xSpan = width + 64;
  const ySpan = height + 64;
  return {
    x: positiveModulo(index * 37 + tick * ((index % 5) + 1), xSpan) - 32,
    y:
      positiveModulo(
        index * 53 + (index % 7) * 11 + tick * ((index % 3) + 1),
        ySpan,
      ) - 32,
    rotationMilliDegrees: positiveModulo(
      index * 17_000 + tick * ((index % 11) + 1) * 100,
      360_000,
    ),
  };
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
