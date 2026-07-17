import type { RunState } from "../simulation/run";

const FPS_WINDOW = 30;

export type HudViewModel = Readonly<{
  life: string;
  distance: string;
  coins: string;
  fps: string;
  level: string;
  speed: string;
  seed: string;
  fullSeed: string;
}>;

export function formatDistance(tick: number): string {
  return `${Math.floor(tick / 60)} m`;
}

export function formatSpeed(
  velocity: Readonly<{ x: number; y: number }>,
): string {
  return `${Math.round((Math.max(Math.abs(velocity.x), Math.abs(velocity.y)) * 60 * 3.6) / 256)} km/h`;
}

export function formatCompactSeed(seed: string): string {
  return `${seed.slice(0, 8)}…${seed.slice(-8)}`;
}

export class RenderFpsWindow {
  private readonly samples = new Float64Array(FPS_WINDOW);
  private index = 0;
  private count = 0;
  private total = 0;

  public update(delta: number): string {
    if (!Number.isFinite(delta) || delta <= 0) {
      this.reset();
      return "—";
    }
    const frameRate = 1000 / delta;
    if (this.count === FPS_WINDOW) this.total -= this.samples[this.index]!;
    else this.count += 1;
    this.samples[this.index] = frameRate;
    this.total += frameRate;
    this.index = (this.index + 1) % FPS_WINDOW;
    return `${Math.round(this.total / this.count)} FPS`;
  }

  public reset(): void {
    this.samples.fill(0);
    this.index = 0;
    this.count = 0;
    this.total = 0;
  }
}

export function projectHud(state: RunState, fps: string): HudViewModel {
  return {
    life: `${state.player.health.current}/${state.player.health.max}`,
    distance: formatDistance(state.tick),
    coins: String(state.runStats.runCoins),
    fps,
    level: "1",
    speed: formatSpeed(state.player.velocity),
    seed: formatCompactSeed(state.config.seed),
    fullSeed: state.config.seed,
  };
}
