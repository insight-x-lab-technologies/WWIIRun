import { describe, expect, it } from "vitest";

import {
  MeasurementCollector,
  calculateFpsWindows,
  evaluateDeviceReports,
  nearestRank,
  stableReportJson,
  summarizeSamples,
  type ReportEnvironment,
} from "../performance/lib/measurement";
import {
  PARALLAX_LAYER_COUNT,
  WORKLOAD_IMAGE_COUNT,
  workloadPosition,
} from "../performance/lib/workload";

const environment: ReportEnvironment = {
  buildCommit: "abc1234",
  device: {
    role: "desktop-primary",
    model: "Lenovo ThinkPad T430u",
    cpu: "unknown",
    gpu: "unknown",
    ramMiB: null,
  },
  platform: {
    os: "Windows (version not provided)",
    browser: "Chromium (version not provided)",
    userAgent: "test-agent",
    renderer: "webgl",
    viewportCss: { width: 1280, height: 720 },
    devicePixelRatio: 1,
    observedRefreshHz: 60,
  },
  conditions: {
    power: "plugged-in",
    temperature: "normal",
    throttling: "none",
    orientation: "landscape",
  },
};

describe("performance measurement contracts", () => {
  it("uses nearest-rank percentiles without interpolation", () => {
    expect(nearestRank([9, 1, 5, 3], 0.5)).toBe(3);
    expect(nearestRank([9, 1, 5, 3], 0.95)).toBe(9);
    expect(nearestRank([], 0.95)).toBeNull();
    expect(() => nearestRank([1], 0)).toThrow("between 0 and 1");
  });

  it("summarizes sorted-independent samples", () => {
    expect(summarizeSamples([4, 1, 3, 2])).toEqual({
      count: 4,
      p50: 2,
      p95: 4,
      p99: 4,
    });
  });

  it("calculates consecutive non-overlapping five-second FPS windows", () => {
    const timestamps = Array.from(
      { length: 600 },
      (_, index) => index * 100 + 50,
    );
    expect(calculateFpsWindows(timestamps, 0, 60_000, 5_000)).toEqual([
      { startMs: 0, endMs: 5_000, callbacks: 50, fps: 10 },
      { startMs: 5_000, endMs: 10_000, callbacks: 50, fps: 10 },
      { startMs: 10_000, endMs: 15_000, callbacks: 50, fps: 10 },
      { startMs: 15_000, endMs: 20_000, callbacks: 50, fps: 10 },
      { startMs: 20_000, endMs: 25_000, callbacks: 50, fps: 10 },
      { startMs: 25_000, endMs: 30_000, callbacks: 50, fps: 10 },
      { startMs: 30_000, endMs: 35_000, callbacks: 50, fps: 10 },
      { startMs: 35_000, endMs: 40_000, callbacks: 50, fps: 10 },
      { startMs: 40_000, endMs: 45_000, callbacks: 50, fps: 10 },
      { startMs: 45_000, endMs: 50_000, callbacks: 50, fps: 10 },
      { startMs: 50_000, endMs: 55_000, callbacks: 50, fps: 10 },
      { startMs: 55_000, endMs: 60_000, callbacks: 50, fps: 10 },
    ]);
  });

  it("covers the full collection interval without waiting for a callback after it", () => {
    const timestamps = Array.from(
      { length: 600 },
      (_, index) => 30_000 + index * 1_000 + 500,
    );

    const windows = calculateFpsWindows(timestamps, 30_000, 600_000, 5_000);

    expect(windows).toHaveLength(120);
    expect(windows[0]).toEqual({
      startMs: 0,
      endMs: 5_000,
      callbacks: 5,
      fps: 1,
    });
    expect(windows.at(-1)).toEqual({
      startMs: 595_000,
      endMs: 600_000,
      callbacks: 5,
      fps: 1,
    });
  });

  it("marks interruptions and incomplete lifecycle invalid without granting pass", () => {
    const collector = new MeasurementCollector({
      warmupMs: 30_000,
      collectionMs: 600_000,
      cycleMs: 120_000,
      expectedCycles: 5,
      expectedTransitions: 4,
    });
    collector.begin(0);
    collector.recordFrame(30_000);
    collector.recordFrame(31_001);
    collector.invalidate("visibility-hidden");
    collector.recordLifecycleCreated();

    const report = collector.finish(environment, 630_000);

    expect(report.status).toBe("invalid");
    expect(report.evaluation).toBe("not-evaluated");
    expect(report.invalidations).toEqual([
      "frame-gap-above-1000ms",
      "visibility-hidden",
      "lifecycle-incomplete",
    ]);
  });

  it("reports unsupported optional APIs as null plus explicit capabilities", () => {
    const collector = new MeasurementCollector({
      warmupMs: 0,
      collectionMs: 10_000,
      cycleMs: 2_000,
      expectedCycles: 5,
      expectedTransitions: 4,
    });
    collector.setCapabilities({ longTask: "unsupported", heap: "unsupported" });
    collector.begin(0);
    for (let index = 0; index <= 600; index += 1) {
      collector.recordFrame(index * (10_000 / 600));
      collector.recordTick(1);
    }
    for (let index = 0; index < 5; index += 1) {
      collector.recordLifecycleCreated();
      if (index < 4) collector.recordLifecycleTransition();
    }

    const report = collector.finish(
      {
        ...environment,
        platform: { ...environment.platform, renderer: null },
      },
      10_000,
    );

    expect(report.capabilities).toEqual({
      longTask: "unsupported",
      heap: "unsupported",
      renderer: "unsupported",
      vram: "unsupported",
    });
    expect(report.longTasks).toBeNull();
    expect(report.heap).toBeNull();
    expect(report.platform.renderer).toBeNull();
    expect(report.vramBytes).toBeNull();
  });

  it("evaluates every threshold without rounding away a failure", () => {
    const collector = new MeasurementCollector({
      warmupMs: 0,
      collectionMs: 5_000,
      cycleMs: 1_000,
      expectedCycles: 5,
      expectedTransitions: 4,
    });
    collector.setCapabilities({ longTask: "supported", heap: "unsupported" });
    collector.begin(0);
    for (let index = 0; index <= 275; index += 1) {
      collector.recordFrame(index * (5_000 / 275));
      collector.recordTick(index === 274 ? 4.001 : 1);
    }
    for (let index = 0; index < 5; index += 1) {
      collector.recordLifecycleCreated();
      if (index < 4) collector.recordLifecycleTransition();
    }

    const report = collector.finish(environment, 5_000);

    expect(report.status).toBe("valid");
    expect(report.evaluation).toBe("fail");
    expect(report.budgets.tickP95).toEqual({
      limit: 4,
      observed: 1,
      status: "pass",
    });
    expect(report.budgets.minimumWindowFps.status).toBe("pass");
  });

  it("exports stable formatted JSON without private identity fields", () => {
    const collector = new MeasurementCollector({
      warmupMs: 0,
      collectionMs: 5_000,
      cycleMs: 1_000,
      expectedCycles: 5,
      expectedTransitions: 4,
    });
    collector.begin(0);
    for (let index = 0; index <= 300; index += 1) {
      collector.recordFrame(index * (5_000 / 300));
      collector.recordTick(1);
    }
    for (let index = 0; index < 5; index += 1) {
      collector.recordLifecycleCreated();
      if (index < 4) collector.recordLifecycleTransition();
    }
    const json = stableReportJson(collector.finish(environment, 5_000));

    expect(json.endsWith("\n")).toBe(true);
    expect(JSON.parse(json)).toMatchObject({
      schemaVersion: "wwiirun.performance-report.v1",
      workloadVersion: "tier-base-stress-v1",
      buildCommit: "abc1234",
    });
    expect(json).not.toMatch(
      /hostname|serial|geolocation|ipAddress|profileName/,
    );
  });

  it("fails the memory gate when every lifecycle sample grows monotonically", () => {
    const collector = completedCollector();
    collector.setCapabilities({ longTask: "unsupported", heap: "supported" });
    for (const bytes of [100, 200, 300, 400, 500]) collector.recordHeap(bytes);

    const report = collector.finish(environment, 5_000);

    expect(report.heap?.monotonicallyGrowing).toBe(true);
    expect(report.budgets.heapGrowth.status).toBe("fail");
    expect(report.failures).toContain("heapGrowth");
  });

  it("evaluates a device only from exactly three comparable valid reports", () => {
    const report = completedCollector().finish(environment, 5_000);
    const distinctPassReports = [
      report,
      {
        ...report,
        measurement: { ...report.measurement, frameSamples: 299 },
      },
      {
        ...report,
        measurement: { ...report.measurement, frameSamples: 298 },
      },
    ];

    expect(evaluateDeviceReports([report])).toEqual({
      evaluation: "not-evaluated",
      failures: ["requires-exactly-three-reports"],
    });
    expect(evaluateDeviceReports(distinctPassReports)).toEqual({
      evaluation: "pass",
      failures: [],
    });
    expect(
      evaluateDeviceReports([
        report,
        distinctPassReports[1]!,
        {
          ...distinctPassReports[2]!,
          evaluation: "fail",
          failures: ["tickP95"],
        },
      ]),
    ).toEqual({ evaluation: "fail", failures: ["run-3:tickP95"] });
    expect(
      evaluateDeviceReports([
        report,
        distinctPassReports[1]!,
        {
          ...distinctPassReports[2]!,
          status: "invalid",
          evaluation: "not-evaluated",
        },
      ]),
    ).toEqual({
      evaluation: "not-evaluated",
      failures: ["run-3-invalid"],
    });
  });

  it("rejects duplicate exports as independent physical repetitions", () => {
    const report = completedCollector().finish(environment, 5_000);
    const distinctReport = {
      ...report,
      measurement: { ...report.measurement, frameSamples: 299 },
    };

    expect(evaluateDeviceReports([report, report, distinctReport])).toEqual({
      evaluation: "not-evaluated",
      failures: ["reports-not-distinct"],
    });
  });

  it("rejects reports whose FPS windows do not cover the declared duration", () => {
    const report = completedCollector().finish(environment, 5_000);
    const incompleteReport = {
      ...report,
      frames: {
        ...report.frames,
        windows: [],
      },
    };

    expect(
      evaluateDeviceReports([
        incompleteReport,
        {
          ...incompleteReport,
          measurement: { ...incompleteReport.measurement, frameSamples: 299 },
        },
        {
          ...incompleteReport,
          measurement: { ...incompleteReport.measurement, frameSamples: 298 },
        },
      ]),
    ).toEqual({
      evaluation: "not-evaluated",
      failures: [
        "run-1-incomplete-fps-windows",
        "run-2-incomplete-fps-windows",
        "run-3-incomplete-fps-windows",
      ],
    });
  });

  it("accepts the F0 595-second coverage exception but rejects less coverage", () => {
    const report = completedCollector().finish(environment, 5_000);
    const legacyBoundary = (index: number): number =>
      index === 3 ? index * 5_000 - 0.000_000_000_015 : index * 5_000;
    const legacyWindows = Array.from({ length: 119 }, (_, index) => ({
      startMs: legacyBoundary(index),
      endMs: legacyBoundary(index + 1),
      callbacks: 300,
      fps: 60,
    }));
    const legacyReport = {
      ...report,
      buildCommit: "1d75de79e7f5f340787a88e7d018a3a406bf59c0",
      measurement: {
        ...report.measurement,
        durationMs: 600_000,
      },
      frames: {
        ...report.frames,
        windows: legacyWindows,
      },
    };
    const distinctLegacyReports = [
      legacyReport,
      {
        ...legacyReport,
        measurement: { ...legacyReport.measurement, frameSamples: 299 },
      },
      {
        ...legacyReport,
        measurement: { ...legacyReport.measurement, frameSamples: 298 },
      },
    ];

    expect(evaluateDeviceReports(distinctLegacyReports)).toEqual({
      evaluation: "pass",
      failures: [],
    });

    expect(
      evaluateDeviceReports(
        distinctLegacyReports.map((item) => ({
          ...item,
          buildCommit: "future-commit",
        })),
      ),
    ).toEqual({
      evaluation: "not-evaluated",
      failures: [
        "run-1-incomplete-fps-windows",
        "run-2-incomplete-fps-windows",
        "run-3-incomplete-fps-windows",
      ],
    });

    expect(
      evaluateDeviceReports(
        distinctLegacyReports.map((item) => ({
          ...item,
          frames: { ...item.frames, windows: legacyWindows.slice(0, -1) },
        })),
      ),
    ).toEqual({
      evaluation: "not-evaluated",
      failures: [
        "run-1-incomplete-fps-windows",
        "run-2-incomplete-fps-windows",
        "run-3-incomplete-fps-windows",
      ],
    });
  });

  it("rejects reports collected in different browser environments", () => {
    const report = completedCollector().finish(environment, 5_000);
    const distinctReports = [
      report,
      {
        ...report,
        measurement: { ...report.measurement, frameSamples: 299 },
      },
      {
        ...report,
        measurement: { ...report.measurement, frameSamples: 298 },
      },
    ];
    const environmentChanges = [
      {
        platform: {
          ...report.platform,
          browser: "Firefox 127",
        },
      },
      {
        platform: {
          ...report.platform,
          viewportCss: { width: 1024, height: 768 },
        },
      },
      {
        platform: {
          ...report.platform,
          devicePixelRatio: 2,
        },
      },
      {
        conditions: {
          ...report.conditions,
          orientation: "portrait" as const,
        },
      },
    ];

    for (const change of environmentChanges) {
      expect(
        evaluateDeviceReports([
          distinctReports[0]!,
          { ...distinctReports[1]!, ...change },
          distinctReports[2]!,
        ]),
      ).toEqual({
        evaluation: "not-evaluated",
        failures: ["reports-not-comparable"],
      });
    }
  });
});

describe("tier-base-stress-v1 logical workload", () => {
  it("fixes the exact layer and visible pooled image counts", () => {
    expect(PARALLAX_LAYER_COUNT).toBe(3);
    expect(WORKLOAD_IMAGE_COUNT).toBe(1_200);
  });

  it("produces the same integer position snapshots for fixed ticks", () => {
    expect(
      [0, 1, 599, 1_199].map((index) => ({
        index,
        tick0: workloadPosition(index, 0, 390, 844),
        tick3600: workloadPosition(index, 3_600, 390, 844),
      })),
    ).toEqual([
      {
        index: 0,
        tick0: { x: -32, y: -32, rotationMilliDegrees: 0 },
        tick3600: { x: 390, y: 844, rotationMilliDegrees: 0 },
      },
      {
        index: 1,
        tick0: { x: 5, y: 32, rotationMilliDegrees: 17_000 },
        tick3600: { x: 395, y: -32, rotationMilliDegrees: 17_000 },
      },
      {
        index: 599,
        tick0: { x: 339, y: -21, rotationMilliDegrees: 103_000 },
        tick3600: { x: 179, y: 791, rotationMilliDegrees: 103_000 },
      },
      {
        index: 1_199,
        tick0: { x: 293, y: -23, rotationMilliDegrees: 223_000 },
        tick3600: { x: 133, y: 789, rotationMilliDegrees: 223_000 },
      },
    ]);
  });
});

function completedCollector(): MeasurementCollector {
  const collector = new MeasurementCollector({
    warmupMs: 0,
    collectionMs: 5_000,
    cycleMs: 1_000,
    expectedCycles: 5,
    expectedTransitions: 4,
  });
  collector.begin(0);
  for (let index = 0; index <= 300; index += 1) {
    collector.recordFrame(index * (5_000 / 300));
    collector.recordTick(1);
  }
  for (let index = 0; index < 5; index += 1) {
    collector.recordLifecycleCreated();
    if (index < 4) collector.recordLifecycleTransition();
  }
  return collector;
}
