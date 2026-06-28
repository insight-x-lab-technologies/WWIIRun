import Phaser from "phaser";

import { StressScene } from "./lib/StressScene";
import {
  MeasurementCollector,
  nearestRank,
  stableReportJson,
  type Capability,
  type PerformanceReport,
  type ReportEnvironment,
} from "./lib/measurement";
import { PARALLAX_LAYER_COUNT, WORKLOAD_IMAGE_COUNT } from "./lib/workload";
import "./styles.css";

interface HarnessSnapshot {
  readonly running: boolean;
  readonly imageCount: number;
  readonly layerCount: number;
  readonly canvasCount: number;
  readonly report: PerformanceReport | null;
}

interface PerformanceMemory {
  readonly usedJSHeapSize: number;
}

const smokeMode =
  new URLSearchParams(window.location.search).get("smoke") === "1";
const measurementConfig = smokeMode
  ? {
      warmupMs: 100,
      collectionMs: 5_000,
      cycleMs: 1_000,
      expectedCycles: 5,
      expectedTransitions: 4,
    }
  : {
      warmupMs: 30_000,
      collectionMs: 600_000,
      cycleMs: 120_000,
      expectedCycles: 5,
      expectedTransitions: 4,
    };
const heapStabilizationMs = smokeMode ? 50 : 5_000;

class PerformanceHarness {
  readonly #root = requireElement<HTMLElement>("game-root");
  readonly #status = requireElement<HTMLElement>("status");
  readonly #output = requireElement<HTMLTextAreaElement>("report-output");
  readonly #exportButton = requireElement<HTMLButtonElement>("export-report");
  #collector: MeasurementCollector | null = null;
  #game: Phaser.Game | null = null;
  #report: PerformanceReport | null = null;
  #running = false;
  #startedAt = 0;
  #nextTransitionAt = 0;
  #animationFrame = 0;
  #observer: PerformanceObserver | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #lastObservedFrame: number | null = null;
  readonly #observedIntervals: number[] = [];
  #renderer: "webgl" | "canvas" | null = null;
  #heapSampleAt: number | null = null;

  public start(): void {
    this.reset();
    this.#collector = new MeasurementCollector(measurementConfig);
    this.#collector.setCapabilities({
      longTask: this.#configureLongTaskObserver(),
      heap: readHeap() === null ? "unsupported" : "supported",
    });
    this.#startedAt = performance.now();
    this.#nextTransitionAt =
      this.#startedAt + measurementConfig.warmupMs + measurementConfig.cycleMs;
    this.#collector.begin(this.#startedAt);
    this.#heapSampleAt = this.#startedAt + measurementConfig.warmupMs;
    this.#running = true;
    this.#status.textContent = "running";
    this.#createGame();
    document.addEventListener("visibilitychange", this.#onVisibilityChange);
    window.addEventListener("resize", this.#onResize);
    this.#animationFrame = requestAnimationFrame(this.#onFrame);
  }

  public reset(): void {
    this.#running = false;
    cancelAnimationFrame(this.#animationFrame);
    this.#observer?.disconnect();
    this.#observer = null;
    document.removeEventListener("visibilitychange", this.#onVisibilityChange);
    window.removeEventListener("resize", this.#onResize);
    this.#destroyGame();
    this.#collector = null;
    this.#report = null;
    this.#observedIntervals.length = 0;
    this.#lastObservedFrame = null;
    this.#heapSampleAt = null;
    this.#output.value = "";
    this.#exportButton.disabled = true;
    this.#status.textContent = "idle";
  }

  public invalidateForTest(reason: string): void {
    if (!smokeMode) return;
    this.#collector?.invalidate(reason);
  }

  public snapshot(): HarnessSnapshot {
    return {
      running: this.#running,
      imageCount: WORKLOAD_IMAGE_COUNT,
      layerCount: PARALLAX_LAYER_COUNT,
      canvasCount: this.#root.querySelectorAll("canvas").length,
      report: this.#report,
    };
  }

  public exportReport(): void {
    if (this.#report === null) return;
    const url = URL.createObjectURL(
      new Blob([stableReportJson(this.#report)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${this.#report.device.role}-${this.#report.buildCommit}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  readonly #onFrame = (timestamp: number): void => {
    if (!this.#running || this.#collector === null) return;
    this.#collector.recordFrame(timestamp);
    if (this.#collector.isCollecting(timestamp)) {
      if (this.#lastObservedFrame !== null) {
        this.#observedIntervals.push(timestamp - this.#lastObservedFrame);
      }
      this.#lastObservedFrame = timestamp;
    }
    if (
      this.#heapSampleAt !== null &&
      timestamp >= this.#heapSampleAt &&
      this.#collector.isCollecting(timestamp)
    ) {
      this.#recordHeap();
      this.#heapSampleAt = null;
    }

    while (
      timestamp >= this.#nextTransitionAt &&
      this.#nextTransitionAt <
        this.#startedAt +
          measurementConfig.warmupMs +
          measurementConfig.collectionMs
    ) {
      this.#collector.recordLifecycleTransition();
      this.#destroyGame();
      this.#createGame();
      this.#heapSampleAt = timestamp + heapStabilizationMs;
      this.#nextTransitionAt += measurementConfig.cycleMs;
    }

    if (
      timestamp >=
      this.#startedAt +
        measurementConfig.warmupMs +
        measurementConfig.collectionMs
    ) {
      this.#finish(timestamp);
      return;
    }
    this.#animationFrame = requestAnimationFrame(this.#onFrame);
  };

  readonly #onVisibilityChange = (): void => {
    if (document.visibilityState !== "visible") {
      this.#collector?.invalidate("visibility-hidden");
    }
  };

  readonly #onResize = (): void => {
    this.#collector?.invalidate("resize-during-collection");
  };

  readonly #onContextLost = (event: Event): void => {
    event.preventDefault();
    this.#collector?.invalidate("webgl-context-lost");
  };

  #finish(timestamp: number): void {
    if (this.#collector === null) return;
    this.#recordHeap();
    this.#report = this.#collector.finish(this.#environment(), timestamp);
    this.#running = false;
    this.#observer?.disconnect();
    this.#observer = null;
    document.removeEventListener("visibilitychange", this.#onVisibilityChange);
    window.removeEventListener("resize", this.#onResize);
    this.#destroyGame();
    this.#output.value = stableReportJson(this.#report);
    this.#exportButton.disabled = false;
    this.#status.textContent = "complete";
  }

  #createGame(): void {
    if (this.#collector === null) return;
    this.#game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.#root,
      backgroundColor: "#07131f",
      scene: new StressScene(this.#collector),
      scale: { mode: Phaser.Scale.RESIZE, width: "100%", height: "100%" },
      input: { keyboard: false, mouse: false, touch: false, gamepad: false },
      audio: { noAudio: true },
      banner: false,
    });
    this.#renderer =
      this.#game.renderer.type === Phaser.WEBGL
        ? "webgl"
        : this.#game.renderer.type === Phaser.CANVAS
          ? "canvas"
          : null;
    this.#canvas = this.#game.canvas;
    this.#canvas.addEventListener("webglcontextlost", this.#onContextLost);
    this.#collector.recordLifecycleCreated();
  }

  #destroyGame(): void {
    this.#canvas?.removeEventListener("webglcontextlost", this.#onContextLost);
    this.#canvas = null;
    this.#game?.destroy(true);
    this.#game = null;
    this.#root.replaceChildren();
  }

  #configureLongTaskObserver(): Capability {
    if (
      typeof PerformanceObserver === "undefined" ||
      !PerformanceObserver.supportedEntryTypes.includes("longtask")
    ) {
      return "unsupported";
    }
    this.#observer = new PerformanceObserver((list) => {
      if (!this.#collector?.isCollecting(performance.now())) return;
      for (const entry of list.getEntries()) {
        this.#collector.recordLongTask(entry.duration);
      }
    });
    this.#observer.observe({ entryTypes: ["longtask"] });
    return "supported";
  }

  #recordHeap(): void {
    const heap = readHeap();
    if (heap !== null) this.#collector?.recordHeap(heap.usedJSHeapSize);
  }

  #environment(): ReportEnvironment {
    const frameP50 = nearestRank(this.#observedIntervals, 0.5);
    const ram = readInput("ram-mib");
    return {
      buildCommit: requiredInput("build-commit"),
      device: {
        role: requiredInput("device-role"),
        model: requiredInput("device-model"),
        cpu: readInput("cpu") || "unknown",
        gpu: readInput("gpu") || "unknown",
        ramMiB: ram === "" ? null : Number(ram),
      },
      platform: {
        os: readInput("os") || "unknown",
        browser: readInput("browser") || "unknown",
        userAgent: navigator.userAgent,
        renderer: this.#renderer,
        viewportCss: { width: window.innerWidth, height: window.innerHeight },
        devicePixelRatio: window.devicePixelRatio,
        observedRefreshHz: frameP50 === null ? null : 1_000 / frameP50,
      },
      conditions: {
        power: selectValue<ReportEnvironment["conditions"]["power"]>("power"),
        temperature:
          selectValue<ReportEnvironment["conditions"]["temperature"]>(
            "temperature",
          ),
        throttling: readInput("throttling") || "none",
        orientation:
          window.innerWidth >= window.innerHeight ? "landscape" : "portrait",
      },
    };
  }
}

function requireElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (element === null)
    throw new Error(`performance harness is missing #${id}.`);
  return element as T;
}

function readInput(id: string): string {
  return requireElement<HTMLInputElement>(id).value.trim();
}

function requiredInput(id: string): string {
  return readInput(id) || "not-provided";
}

function selectValue<T extends string>(id: string): T {
  return requireElement<HTMLSelectElement>(id).value as T;
}

function readHeap(): PerformanceMemory | null {
  const candidate = (
    performance as Performance & { memory?: PerformanceMemory }
  ).memory;
  return candidate === undefined ? null : candidate;
}

const harness = new PerformanceHarness();
requireElement<HTMLButtonElement>("start").addEventListener("click", () =>
  harness.start(),
);
requireElement<HTMLButtonElement>("stop").addEventListener("click", () =>
  harness.reset(),
);
requireElement<HTMLButtonElement>("export-report").addEventListener(
  "click",
  () => harness.exportReport(),
);

window.__WWIIRUN_PERFORMANCE__ = {
  snapshot: () => harness.snapshot(),
  invalidateForTest: (reason: string) => harness.invalidateForTest(reason),
};

declare global {
  interface Window {
    __WWIIRUN_PERFORMANCE__?: {
      readonly snapshot: () => HarnessSnapshot;
      readonly invalidateForTest: (reason: string) => void;
    };
  }
}
