import type { RunState } from "../simulation/run";

export type GameOverSummary = Readonly<{
  mode: RunState["config"]["mode"];
  seed: RunState["config"]["seed"];
  distanceMeters: number;
  durationTicks: number;
  durationSeconds: number;
  runCoins: number;
  enemiesDestroyed: number;
  level: 1;
}>;

export function projectGameOverSummary(state: RunState): GameOverSummary {
  const values = [
    state.tick,
    state.runStats.runCoins,
    state.runStats.enemiesDestroyed,
  ];
  if (!values.every((value) => Number.isInteger(value) && value >= 0))
    throw new RangeError(
      "Game over summary requires non-negative integer state.",
    );

  return Object.freeze({
    mode: state.config.mode,
    seed: state.config.seed,
    distanceMeters: Math.floor(state.tick / 60),
    durationTicks: state.tick,
    durationSeconds: Math.floor(state.tick / 60),
    runCoins: state.runStats.runCoins,
    enemiesDestroyed: state.runStats.enemiesDestroyed,
    level: 1,
  });
}

export function formatGameOverSummary(
  summary: GameOverSummary,
): readonly string[] {
  return [
    `Mode: ${summary.mode}`,
    `Seed: ${summary.seed}`,
    `Distance: ${summary.distanceMeters} m`,
    `Run coins: ${summary.runCoins}`,
    `Enemies destroyed: ${summary.enemiesDestroyed}`,
    `Duration: ${summary.durationTicks} ticks (${summary.durationSeconds} s)`,
    `Level: ${summary.level}`,
  ];
}
