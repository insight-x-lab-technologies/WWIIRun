import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  BudgetCheckError,
  evaluateBudgetMetrics,
  inspectProductionBuild,
  type BudgetMetrics,
  type PerformanceBudgets,
} from "../../scripts/performanceBudget";

const createdDirectories: string[] = [];

const limits: PerformanceBudgets = {
  schemaVersion: 1,
  rationale: "F0-06 approved scaffold baseline.",
  limits: {
    largestJavaScriptRawBytes: 1_250_000,
    largestJavaScriptGzipBytes: 335_000,
    initialJavaScriptGzipBytes: 350_000,
    initialTextGzipBytes: 400_000,
    initialPayloadBytes: 2_097_152,
    corePayloadBytes: 10_485_760,
    rasterFileBytes: 524_288,
    audioFileBytes: 1_572_864,
  },
};

afterEach(async () => {
  await Promise.all(
    createdDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("performance build budget", () => {
  it("accepts every metric exactly at its limit and rejects one byte above", () => {
    const exact: BudgetMetrics = {
      largestJavaScriptRawBytes: 1_250_000,
      largestJavaScriptGzipBytes: 335_000,
      initialJavaScriptGzipBytes: 350_000,
      initialTextGzipBytes: 400_000,
      initialPayloadBytes: 2_097_152,
      corePayloadBytes: 10_485_760,
      largestRasterFileBytes: 524_288,
      largestAudioFileBytes: 1_572_864,
    };

    expect(evaluateBudgetMetrics(exact, limits)).toEqual([]);
    expect(
      evaluateBudgetMetrics(
        { ...exact, largestJavaScriptRawBytes: 1_250_001 },
        limits,
      ),
    ).toEqual([
      "largestJavaScriptRawBytes exceeded: observed 1250001 bytes, limit 1250000 bytes.",
    ]);
  });

  it("classifies eager and lazy assets, counts duplicates once, and measures gzip", async () => {
    const fixture = await createBuildFixture();

    const result = inspectProductionBuild({
      distDirectory: fixture.dist,
      budgetFile: fixture.budgets,
    });

    expect(result.initialFiles).toEqual([
      "assets/eager.png",
      "assets/main.css",
      "assets/main.js",
      "index.html",
    ]);
    expect(result.coreFiles).toEqual([
      "assets/eager.png",
      "assets/lazy.js",
      "assets/lazy.png",
      "assets/main.css",
      "assets/main.js",
      "index.html",
    ]);
    expect(result.metrics.initialJavaScriptGzipBytes).toBeGreaterThan(0);
    expect(result.metrics.corePayloadBytes).toBe(
      Buffer.byteLength(
        '<!doctype html><script type="module" src="/assets/main.js"></script>',
      ) +
        Buffer.byteLength("export const value = 1;") +
        Buffer.byteLength("export const lazy = 1;") +
        Buffer.byteLength("body{}") +
        4 +
        5,
    );
  });

  it("fails closed for missing config, dist, manifest, and entrypoint", async () => {
    const root = await temporaryDirectory();
    const dist = join(root, "dist");
    const budgetFile = join(root, "performance-budgets.json");

    expect(() =>
      inspectProductionBuild({ distDirectory: dist, budgetFile }),
    ).toThrow("budget config is missing");
    await writeFile(budgetFile, JSON.stringify(limits));
    expect(() =>
      inspectProductionBuild({ distDirectory: dist, budgetFile }),
    ).toThrow("production dist directory is missing");
    await mkdir(dist);
    await writeFile(join(dist, "index.html"), "<!doctype html>");
    expect(() =>
      inspectProductionBuild({ distDirectory: dist, budgetFile }),
    ).toThrow("Vite manifest is missing");
    await mkdir(join(dist, ".vite"));
    await writeFile(join(dist, ".vite", "manifest.json"), "{}");
    expect(() =>
      inspectProductionBuild({ distDirectory: dist, budgetFile }),
    ).toThrow("manifest does not contain an entrypoint");
  });

  it("rejects invalid config, unknown emitted extensions, and remote assets", async () => {
    const invalidConfig = await temporaryDirectory();
    await writeFile(join(invalidConfig, "budgets.json"), '{"schemaVersion":2}');
    expect(() =>
      inspectProductionBuild({
        distDirectory: join(invalidConfig, "dist"),
        budgetFile: join(invalidConfig, "budgets.json"),
      }),
    ).toThrow("budget config is invalid");

    const unknown = await createBuildFixture();
    await writeFile(join(unknown.dist, "assets", "data.bin"), "x");
    expect(() =>
      inspectProductionBuild({
        distDirectory: unknown.dist,
        budgetFile: unknown.budgets,
      }),
    ).toThrow("unknown emitted extension: assets/data.bin");

    const remote = await createBuildFixture({ remoteAsset: true });
    expect(() =>
      inspectProductionBuild({
        distDirectory: remote.dist,
        budgetFile: remote.budgets,
      }),
    ).toThrow("remote asset URL is forbidden");

    const remoteHtml = await createBuildFixture({ remoteHtml: true });
    expect(() =>
      inspectProductionBuild({
        distDirectory: remoteHtml.dist,
        budgetFile: remoteHtml.budgets,
      }),
    ).toThrow("remote asset URL is forbidden in index.html");

    const remoteCss = await createBuildFixture({ remoteCss: true });
    expect(() =>
      inspectProductionBuild({
        distDirectory: remoteCss.dist,
        budgetFile: remoteCss.budgets,
      }),
    ).toThrow("remote asset URL is forbidden in assets/main.css");
  });

  it("uses deterministic typed errors for budget violations", () => {
    const violations = evaluateBudgetMetrics(
      {
        largestJavaScriptRawBytes: 1_250_001,
        largestJavaScriptGzipBytes: 0,
        initialJavaScriptGzipBytes: 0,
        initialTextGzipBytes: 0,
        initialPayloadBytes: 0,
        corePayloadBytes: 0,
        largestRasterFileBytes: 0,
        largestAudioFileBytes: 0,
      },
      limits,
    );
    const error = new BudgetCheckError(violations);

    expect(error.message).toBe(
      "Performance budget failed:\n- largestJavaScriptRawBytes exceeded: observed 1250001 bytes, limit 1250000 bytes.",
    );
  });
});

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "wwiirun-performance-"));
  createdDirectories.push(directory);
  return directory;
}

async function createBuildFixture(
  options: {
    readonly remoteAsset?: boolean;
    readonly remoteCss?: boolean;
    readonly remoteHtml?: boolean;
  } = {},
): Promise<{ readonly dist: string; readonly budgets: string }> {
  const root = await temporaryDirectory();
  const dist = join(root, "dist");
  const assets = join(dist, "assets");
  const manifestDirectory = join(dist, ".vite");
  const budgets = join(root, "performance-budgets.json");
  await mkdir(assets, { recursive: true });
  await mkdir(manifestDirectory, { recursive: true });
  await writeFile(budgets, JSON.stringify(limits));
  await writeFile(
    join(dist, "index.html"),
    options.remoteHtml
      ? '<!doctype html><script src="https://example.com/remote.js"></script>'
      : '<!doctype html><script type="module" src="/assets/main.js"></script>',
  );
  await writeFile(join(assets, "main.js"), "export const value = 1;");
  await writeFile(join(assets, "lazy.js"), "export const lazy = 1;");
  await writeFile(
    join(assets, "main.css"),
    options.remoteCss
      ? 'body{background:url("https://example.com/remote.png")}'
      : "body{}",
  );
  await writeFile(join(assets, "eager.png"), Buffer.from([1, 2, 3, 4]));
  await writeFile(join(assets, "lazy.png"), Buffer.from([1, 2, 3, 4, 5]));
  await writeFile(
    join(manifestDirectory, "manifest.json"),
    JSON.stringify({
      "index.html": {
        file: "assets/main.js",
        isEntry: true,
        css: ["assets/main.css"],
        assets: options.remoteAsset
          ? ["https://example.com/eager.png"]
          : ["assets/eager.png", "assets/eager.png"],
        dynamicImports: ["src/lazy.ts"],
      },
      "src/lazy.ts": {
        file: "assets/lazy.js",
        isDynamicEntry: true,
        assets: ["assets/lazy.png", "assets/eager.png"],
      },
    }),
  );
  return { dist, budgets };
}
