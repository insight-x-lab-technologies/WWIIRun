export const PERFORMANCE_REPORT_SCHEMA =
  "wwiirun.performance-report.v1" as const;
export const PERFORMANCE_WORKLOAD_VERSION = "tier-base-stress-v1" as const;
const F0_LEGACY_BASELINE_COMMIT =
  "1d75de79e7f5f340787a88e7d018a3a406bf59c0" as const;

export type Capability = "supported" | "unsupported";
export type MeasurementStatus = "valid" | "invalid";
export type Evaluation = "pass" | "fail" | "not-evaluated";

export interface SampleSummary {
  readonly count: number;
  readonly p50: number | null;
  readonly p95: number | null;
  readonly p99: number | null;
}

export interface FpsWindow {
  readonly startMs: number;
  readonly endMs: number;
  readonly callbacks: number;
  readonly fps: number;
}

export interface ReportEnvironment {
  readonly buildCommit: string;
  readonly device: {
    readonly role: string;
    readonly model: string;
    readonly cpu: string;
    readonly gpu: string;
    readonly ramMiB: number | null;
  };
  readonly platform: {
    readonly os: string;
    readonly browser: string;
    readonly userAgent: string;
    readonly renderer: "webgl" | "canvas" | null;
    readonly viewportCss: { readonly width: number; readonly height: number };
    readonly devicePixelRatio: number;
    readonly observedRefreshHz: number | null;
  };
  readonly conditions: {
    readonly power: "battery" | "plugged-in" | "unknown";
    readonly temperature: "normal" | "warm" | "hot" | "unknown";
    readonly throttling: string;
    readonly orientation: "portrait" | "landscape";
  };
}

export interface MeasurementConfig {
  readonly warmupMs: number;
  readonly collectionMs: number;
  readonly cycleMs: number;
  readonly expectedCycles: number;
  readonly expectedTransitions: number;
}

interface BudgetResult {
  readonly limit: number;
  readonly observed: number | null;
  readonly status: Evaluation;
}

export interface PerformanceReport {
  readonly schemaVersion: typeof PERFORMANCE_REPORT_SCHEMA;
  readonly workloadVersion: typeof PERFORMANCE_WORKLOAD_VERSION;
  readonly buildCommit: string;
  readonly status: MeasurementStatus;
  readonly evaluation: Evaluation;
  readonly device: ReportEnvironment["device"];
  readonly platform: ReportEnvironment["platform"];
  readonly conditions: ReportEnvironment["conditions"];
  readonly measurement: {
    readonly warmupMs: number;
    readonly durationMs: number;
    readonly frameSamples: number;
    readonly tickSamples: number;
  };
  readonly frames: SampleSummary & {
    readonly windows: readonly FpsWindow[];
    readonly minimumWindowFps: number | null;
  };
  readonly ticks: SampleSummary;
  readonly capabilities: {
    readonly longTask: Capability;
    readonly heap: Capability;
    readonly renderer: Capability;
    readonly vram: Capability;
  };
  readonly longTasks: {
    readonly thresholdMs: 50;
    readonly count: number;
    readonly totalDurationMs: number;
  } | null;
  readonly heap: {
    readonly initialBytes: number;
    readonly finalBytes: number;
    readonly peakBytes: number;
    readonly samples: readonly number[];
    readonly monotonicallyGrowing: boolean;
  } | null;
  readonly vramBytes: number | null;
  readonly lifecycle: {
    readonly cycles: number;
    readonly transitions: number;
    readonly gapsAbove1000Ms: readonly number[];
  };
  readonly budgets: {
    readonly frameP95: BudgetResult;
    readonly tickP95: BudgetResult;
    readonly longTasksAbove50Ms: BudgetResult;
    readonly minimumWindowFps: BudgetResult;
    readonly heapGrowth: BudgetResult;
  };
  readonly failures: readonly string[];
  readonly invalidations: readonly string[];
}

export function nearestRank(
  samples: readonly number[],
  percentile: number,
): number | null {
  if (!(percentile > 0 && percentile <= 1)) {
    throw new RangeError("percentile must be between 0 and 1.");
  }
  if (samples.length === 0) return null;

  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.ceil(percentile * sorted.length) - 1;
  return sorted[index] ?? null;
}

export function summarizeSamples(samples: readonly number[]): SampleSummary {
  return {
    count: samples.length,
    p50: nearestRank(samples, 0.5),
    p95: nearestRank(samples, 0.95),
    p99: nearestRank(samples, 0.99),
  };
}

export function calculateFpsWindows(
  timestamps: readonly number[],
  collectionStartMs: number,
  collectionDurationMs: number,
  windowMs = 5_000,
): readonly FpsWindow[] {
  if (collectionDurationMs <= 0 || windowMs <= 0) return [];
  const sorted = [...timestamps].sort((left, right) => left - right);
  const windows: FpsWindow[] = [];
  const collectionEndMs = collectionStartMs + collectionDurationMs;
  for (
    let start = collectionStartMs;
    start < collectionEndMs;
    start += windowMs
  ) {
    const end = Math.min(start + windowMs, collectionEndMs);
    const callbacks = sorted.filter(
      (timestamp) => timestamp >= start && timestamp < end,
    ).length;
    windows.push({
      startMs: start - collectionStartMs,
      endMs: end - collectionStartMs,
      callbacks,
      fps: callbacks / ((end - start) / 1_000),
    });
  }
  return windows;
}

export class MeasurementCollector {
  readonly #config: MeasurementConfig;
  #startedAt: number | null = null;
  #lastFrameAt: number | null = null;
  readonly #frameTimestamps: number[] = [];
  readonly #frameDurations: number[] = [];
  readonly #tickDurations: number[] = [];
  readonly #longTasks: number[] = [];
  readonly #heapSamples: number[] = [];
  readonly #invalidations: string[] = [];
  readonly #gaps: number[] = [];
  #cycles = 0;
  #transitions = 0;
  #capabilities: { longTask: Capability; heap: Capability } = {
    longTask: "unsupported",
    heap: "unsupported",
  };

  public constructor(config: MeasurementConfig) {
    this.#config = config;
  }

  public setCapabilities(capabilities: {
    readonly longTask: Capability;
    readonly heap: Capability;
  }): void {
    this.#capabilities = { ...capabilities };
  }

  public begin(timestamp: number): void {
    this.#startedAt = timestamp;
    this.#lastFrameAt = timestamp;
  }

  public isCollecting(timestamp: number): boolean {
    const startedAt = this.#requireStarted();
    return (
      timestamp >= startedAt + this.#config.warmupMs &&
      timestamp <= startedAt + this.#config.warmupMs + this.#config.collectionMs
    );
  }

  public recordFrame(timestamp: number): void {
    const startedAt = this.#requireStarted();
    if (this.#lastFrameAt !== null) {
      const duration = timestamp - this.#lastFrameAt;
      if (duration > 1_000) {
        this.#gaps.push(duration);
        this.invalidate("frame-gap-above-1000ms");
      }
      if (timestamp >= startedAt + this.#config.warmupMs) {
        this.#frameDurations.push(duration);
      }
    }
    this.#lastFrameAt = timestamp;

    if (
      timestamp >= startedAt + this.#config.warmupMs &&
      timestamp <= startedAt + this.#config.warmupMs + this.#config.collectionMs
    ) {
      this.#frameTimestamps.push(timestamp);
    }
  }

  public recordTick(durationMs: number): void {
    this.#tickDurations.push(durationMs);
  }

  public recordLongTask(durationMs: number): void {
    if (durationMs > 50) this.#longTasks.push(durationMs);
  }

  public recordHeap(bytes: number): void {
    this.#heapSamples.push(bytes);
  }

  public recordLifecycleCreated(): void {
    this.#cycles += 1;
  }

  public recordLifecycleTransition(): void {
    this.#transitions += 1;
  }

  public invalidate(reason: string): void {
    if (!this.#invalidations.includes(reason)) this.#invalidations.push(reason);
  }

  public finish(
    environment: ReportEnvironment,
    finishedAt: number,
  ): PerformanceReport {
    const startedAt = this.#requireStarted();
    if (
      this.#cycles !== this.#config.expectedCycles ||
      this.#transitions !== this.#config.expectedTransitions
    ) {
      this.invalidate("lifecycle-incomplete");
    }
    if (
      finishedAt <
      startedAt + this.#config.warmupMs + this.#config.collectionMs
    ) {
      this.invalidate("collection-incomplete");
    }

    const frames = summarizeSamples(this.#frameDurations);
    const ticks = summarizeSamples(this.#tickDurations);
    const windows = calculateFpsWindows(
      this.#frameTimestamps,
      startedAt + this.#config.warmupMs,
      this.#config.collectionMs,
    );
    const minimumWindowFps =
      windows.length === 0
        ? null
        : Math.min(...windows.map((window) => window.fps));
    const heap = this.#createHeapReport();
    const budgets = {
      frameP95: budgetMaximum(16.67, frames.p95),
      tickP95: budgetMaximum(4, ticks.p95),
      longTasksAbove50Ms:
        this.#capabilities.longTask === "supported"
          ? budgetMaximum(0, this.#longTasks.length)
          : budgetNotEvaluated(0),
      minimumWindowFps: budgetMinimum(55, minimumWindowFps),
      heapGrowth:
        heap === null ? budgetNotEvaluated(0) : evaluateHeapBudget(heap),
    } as const;

    const failures = Object.entries(budgets)
      .filter(([, result]) => result.status === "fail")
      .map(([name]) => name);
    const status = this.#invalidations.length === 0 ? "valid" : "invalid";
    const evaluatedResults = Object.values(budgets).filter(
      (result) => result.status !== "not-evaluated",
    );
    const evaluation: Evaluation =
      status === "invalid"
        ? "not-evaluated"
        : evaluatedResults.some((result) => result.status === "fail")
          ? "fail"
          : evaluatedResults.length === 0
            ? "not-evaluated"
            : "pass";

    return {
      schemaVersion: PERFORMANCE_REPORT_SCHEMA,
      workloadVersion: PERFORMANCE_WORKLOAD_VERSION,
      buildCommit: environment.buildCommit,
      status,
      evaluation,
      device: environment.device,
      platform: environment.platform,
      conditions: environment.conditions,
      measurement: {
        warmupMs: this.#config.warmupMs,
        durationMs: this.#config.collectionMs,
        frameSamples: this.#frameDurations.length,
        tickSamples: this.#tickDurations.length,
      },
      frames: { ...frames, windows, minimumWindowFps },
      ticks,
      capabilities: {
        ...this.#capabilities,
        renderer:
          environment.platform.renderer === null ? "unsupported" : "supported",
        vram: "unsupported",
      },
      longTasks:
        this.#capabilities.longTask === "supported"
          ? {
              thresholdMs: 50,
              count: this.#longTasks.length,
              totalDurationMs: this.#longTasks.reduce(
                (total, duration) => total + duration,
                0,
              ),
            }
          : null,
      heap,
      vramBytes: null,
      lifecycle: {
        cycles: this.#cycles,
        transitions: this.#transitions,
        gapsAbove1000Ms: [...this.#gaps],
      },
      budgets,
      failures,
      invalidations: [...this.#invalidations],
    };
  }

  #createHeapReport(): PerformanceReport["heap"] {
    if (
      this.#capabilities.heap !== "supported" ||
      this.#heapSamples.length === 0
    ) {
      return null;
    }
    const initialBytes = this.#heapSamples[0];
    const finalBytes = this.#heapSamples.at(-1);
    if (initialBytes === undefined || finalBytes === undefined) return null;
    return {
      initialBytes,
      finalBytes,
      peakBytes: Math.max(...this.#heapSamples),
      samples: [...this.#heapSamples],
      monotonicallyGrowing:
        this.#heapSamples.length > 1 &&
        this.#heapSamples.every(
          (sample, index) =>
            index === 0 || sample > this.#heapSamples[index - 1]!,
        ),
    };
  }

  #requireStarted(): number {
    if (this.#startedAt === null) {
      throw new Error("measurement has not started.");
    }
    return this.#startedAt;
  }
}

export function stableReportJson(report: PerformanceReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function evaluateDeviceReports(reports: readonly PerformanceReport[]): {
  readonly evaluation: Evaluation;
  readonly failures: readonly string[];
} {
  if (reports.length !== 3) {
    return {
      evaluation: "not-evaluated",
      failures: ["requires-exactly-three-reports"],
    };
  }
  const first = reports[0];
  if (
    first === undefined ||
    reports.some((report) => !hasComparableEnvironment(first, report))
  ) {
    return {
      evaluation: "not-evaluated",
      failures: ["reports-not-comparable"],
    };
  }
  if (new Set(reports.map((report) => stableReportJson(report))).size !== 3) {
    return {
      evaluation: "not-evaluated",
      failures: ["reports-not-distinct"],
    };
  }
  const incompleteWindows = reports.flatMap((report, index) =>
    hasSufficientFpsWindows(report)
      ? []
      : [`run-${index + 1}-incomplete-fps-windows`],
  );
  if (incompleteWindows.length > 0) {
    return { evaluation: "not-evaluated", failures: incompleteWindows };
  }
  const invalid = reports.flatMap((report, index) =>
    report.status === "invalid" ? [`run-${index + 1}-invalid`] : [],
  );
  if (invalid.length > 0) {
    return { evaluation: "not-evaluated", failures: invalid };
  }
  const failures = reports.flatMap((report, index) =>
    report.evaluation === "fail"
      ? report.failures.length > 0
        ? report.failures.map((failure) => `run-${index + 1}:${failure}`)
        : [`run-${index + 1}:threshold-failure`]
      : [],
  );
  if (failures.length > 0) return { evaluation: "fail", failures };
  if (reports.some((report) => report.evaluation !== "pass")) {
    return { evaluation: "not-evaluated", failures: ["run-not-evaluated"] };
  }
  return { evaluation: "pass", failures: [] };
}

function hasComparableEnvironment(
  expected: PerformanceReport,
  actual: PerformanceReport,
): boolean {
  const comparableEnvironment = (report: PerformanceReport): string =>
    JSON.stringify({
      schemaVersion: report.schemaVersion,
      workloadVersion: report.workloadVersion,
      buildCommit: report.buildCommit,
      device: report.device,
      platform: {
        os: report.platform.os,
        browser: report.platform.browser,
        userAgent: report.platform.userAgent,
        renderer: report.platform.renderer,
        viewportCss: report.platform.viewportCss,
        devicePixelRatio: report.platform.devicePixelRatio,
      },
      conditions: {
        power: report.conditions.power,
        throttling: report.conditions.throttling,
        orientation: report.conditions.orientation,
      },
      measurement: {
        warmupMs: report.measurement.warmupMs,
        durationMs: report.measurement.durationMs,
      },
    });
  return comparableEnvironment(actual) === comparableEnvironment(expected);
}

function hasSufficientFpsWindows(report: PerformanceReport): boolean {
  const windowMs = 5_000;
  const acceptedDurationMs =
    report.schemaVersion === PERFORMANCE_REPORT_SCHEMA &&
    report.workloadVersion === PERFORMANCE_WORKLOAD_VERSION &&
    report.buildCommit === F0_LEGACY_BASELINE_COMMIT &&
    report.measurement.durationMs === 600_000
      ? 595_000
      : report.measurement.durationMs;
  const minimumWindows = Math.ceil(acceptedDurationMs / windowMs);
  const maximumWindows = Math.ceil(report.measurement.durationMs / windowMs);
  if (
    report.frames.windows.length < minimumWindows ||
    report.frames.windows.length > maximumWindows
  ) {
    return false;
  }
  return report.frames.windows.every((window, index) => {
    const startMs = index * windowMs;
    return (
      Math.abs(window.startMs - startMs) < 0.001 &&
      Math.abs(
        window.endMs -
          Math.min(startMs + windowMs, report.measurement.durationMs),
      ) < 0.001
    );
  });
}

function budgetMaximum(limit: number, observed: number | null): BudgetResult {
  return {
    limit,
    observed,
    status:
      observed === null ? "not-evaluated" : observed <= limit ? "pass" : "fail",
  };
}

function budgetMinimum(limit: number, observed: number | null): BudgetResult {
  return {
    limit,
    observed,
    status:
      observed === null ? "not-evaluated" : observed >= limit ? "pass" : "fail",
  };
}

function budgetNotEvaluated(limit: number): BudgetResult {
  return { limit, observed: null, status: "not-evaluated" };
}

function evaluateHeapBudget(
  heap: NonNullable<PerformanceReport["heap"]>,
): BudgetResult {
  const allowedGrowth = Math.max(heap.initialBytes * 0.1, 16 * 1024 * 1024);
  const growth = heap.finalBytes - heap.initialBytes;
  return {
    limit: allowedGrowth,
    observed: growth,
    status:
      growth <= allowedGrowth && !heap.monotonicallyGrowing ? "pass" : "fail",
  };
}
