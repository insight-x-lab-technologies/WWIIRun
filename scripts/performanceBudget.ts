import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { extname, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

export interface PerformanceBudgets {
  readonly schemaVersion: 1;
  readonly rationale: string;
  readonly limits: {
    readonly largestJavaScriptRawBytes: number;
    readonly largestJavaScriptGzipBytes: number;
    readonly initialJavaScriptGzipBytes: number;
    readonly initialTextGzipBytes: number;
    readonly initialPayloadBytes: number;
    readonly corePayloadBytes: number;
    readonly rasterFileBytes: number;
    readonly audioFileBytes: number;
  };
}

export interface BudgetMetrics {
  readonly largestJavaScriptRawBytes: number;
  readonly largestJavaScriptGzipBytes: number;
  readonly initialJavaScriptGzipBytes: number;
  readonly initialTextGzipBytes: number;
  readonly initialPayloadBytes: number;
  readonly corePayloadBytes: number;
  readonly largestRasterFileBytes: number;
  readonly largestAudioFileBytes: number;
}

export interface BudgetCheckResult {
  readonly metrics: BudgetMetrics;
  readonly initialFiles: readonly string[];
  readonly coreFiles: readonly string[];
  readonly violations: readonly string[];
}

interface ManifestEntry {
  readonly file?: unknown;
  readonly isEntry?: unknown;
  readonly imports?: unknown;
  readonly dynamicImports?: unknown;
  readonly css?: unknown;
  readonly assets?: unknown;
}

const PAYLOAD_EXTENSIONS = new Set([
  ".html",
  ".css",
  ".js",
  ".json",
  ".png",
  ".webp",
  ".jpg",
  ".jpeg",
  ".avif",
  ".svg",
  ".ogg",
  ".mp3",
  ".m4a",
  ".aac",
  ".wav",
  ".woff2",
  ".ico",
  ".webmanifest",
]);
const TEXT_EXTENSIONS = new Set([".html", ".css", ".js"]);
const RASTER_EXTENSIONS = new Set([".png", ".webp", ".jpg", ".jpeg", ".avif"]);
const AUDIO_EXTENSIONS = new Set([".ogg", ".mp3", ".m4a", ".aac", ".wav"]);

export class BudgetCheckError extends Error {
  public constructor(violations: readonly string[]) {
    super(
      `Performance budget failed:\n${violations.map((item) => `- ${item}`).join("\n")}`,
    );
    this.name = "BudgetCheckError";
  }
}

export function inspectProductionBuild(options: {
  readonly distDirectory: string;
  readonly budgetFile: string;
}): BudgetCheckResult {
  const budgets = readBudgets(options.budgetFile);
  if (
    !existsSync(options.distDirectory) ||
    !statSync(options.distDirectory).isDirectory()
  ) {
    throw new Error(
      `production dist directory is missing: ${options.distDirectory}`,
    );
  }
  const manifestPath = join(options.distDirectory, ".vite", "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`Vite manifest is missing: ${manifestPath}`);
  }

  const manifest = readManifest(manifestPath);
  const entryKey = Object.keys(manifest).find(
    (key) => manifest[key]?.isEntry === true,
  );
  if (entryKey === undefined) {
    throw new Error("manifest does not contain an entrypoint.");
  }

  validateManifestReferences(manifest);
  const initialFiles = collectInitialFiles(manifest, entryKey);
  initialFiles.add("index.html");
  for (const file of collectHtmlReferences(options.distDirectory)) {
    initialFiles.add(file);
  }
  const coreFiles = collectCoreFiles(options.distDirectory);
  validateFilesExist(options.distDirectory, initialFiles);
  validateCssReferences(options.distDirectory, coreFiles);

  const metrics = calculateMetrics(
    options.distDirectory,
    initialFiles,
    coreFiles,
  );
  const violations = evaluateBudgetMetrics(metrics, budgets);
  return {
    metrics,
    initialFiles: [...initialFiles].sort(),
    coreFiles: [...coreFiles].sort(),
    violations,
  };
}

export function evaluateBudgetMetrics(
  metrics: BudgetMetrics,
  budgets: PerformanceBudgets,
): readonly string[] {
  const checks: ReadonlyArray<readonly [keyof BudgetMetrics, number, number]> =
    [
      [
        "largestJavaScriptRawBytes",
        metrics.largestJavaScriptRawBytes,
        budgets.limits.largestJavaScriptRawBytes,
      ],
      [
        "largestJavaScriptGzipBytes",
        metrics.largestJavaScriptGzipBytes,
        budgets.limits.largestJavaScriptGzipBytes,
      ],
      [
        "initialJavaScriptGzipBytes",
        metrics.initialJavaScriptGzipBytes,
        budgets.limits.initialJavaScriptGzipBytes,
      ],
      [
        "initialTextGzipBytes",
        metrics.initialTextGzipBytes,
        budgets.limits.initialTextGzipBytes,
      ],
      [
        "initialPayloadBytes",
        metrics.initialPayloadBytes,
        budgets.limits.initialPayloadBytes,
      ],
      [
        "corePayloadBytes",
        metrics.corePayloadBytes,
        budgets.limits.corePayloadBytes,
      ],
      [
        "largestRasterFileBytes",
        metrics.largestRasterFileBytes,
        budgets.limits.rasterFileBytes,
      ],
      [
        "largestAudioFileBytes",
        metrics.largestAudioFileBytes,
        budgets.limits.audioFileBytes,
      ],
    ];

  return checks
    .filter(([, observed, limit]) => observed > limit)
    .map(
      ([metric, observed, limit]) =>
        `${metric} exceeded: observed ${observed} bytes, limit ${limit} bytes.`,
    );
}

export function formatBudgetSummary(result: BudgetCheckResult): string {
  const lines = [
    "Production performance budget",
    `largest JS: ${result.metrics.largestJavaScriptRawBytes} raw / ${result.metrics.largestJavaScriptGzipBytes} gzip bytes`,
    `initial JS gzip: ${result.metrics.initialJavaScriptGzipBytes} bytes`,
    `initial text gzip: ${result.metrics.initialTextGzipBytes} bytes`,
    `initial payload: ${result.metrics.initialPayloadBytes} bytes`,
    `core payload: ${result.metrics.corePayloadBytes} bytes`,
    `initial files: ${result.initialFiles.length}; core files: ${result.coreFiles.length}`,
  ];
  return lines.join("\n");
}

function readBudgets(path: string): PerformanceBudgets {
  if (!existsSync(path)) throw new Error(`budget config is missing: ${path}`);
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`budget config is invalid: ${path}`);
  }
  if (!isPerformanceBudgets(value)) {
    throw new Error(`budget config is invalid: ${path}`);
  }
  return value;
}

function isPerformanceBudgets(value: unknown): value is PerformanceBudgets {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (
    record.schemaVersion !== 1 ||
    typeof record.rationale !== "string" ||
    typeof record.limits !== "object" ||
    record.limits === null
  ) {
    return false;
  }
  const limits = record.limits as Record<string, unknown>;
  return [
    "largestJavaScriptRawBytes",
    "largestJavaScriptGzipBytes",
    "initialJavaScriptGzipBytes",
    "initialTextGzipBytes",
    "initialPayloadBytes",
    "corePayloadBytes",
    "rasterFileBytes",
    "audioFileBytes",
  ].every((key) => isNonNegativeInteger(limits[key]));
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 0;
}

function readManifest(path: string): Record<string, ManifestEntry> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new Error(`Vite manifest is invalid: ${path}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Vite manifest is invalid: ${path}`);
  }
  return parsed as Record<string, ManifestEntry>;
}

function validateManifestReferences(
  manifest: Readonly<Record<string, ManifestEntry>>,
): void {
  for (const [key, entry] of Object.entries(manifest)) {
    const references = [
      entry.file,
      ...stringArray(entry.css),
      ...stringArray(entry.assets),
    ];
    for (const reference of references) {
      if (typeof reference !== "string") {
        throw new Error(`manifest reference is invalid in ${key}.`);
      }
      if (/^(?:https?:)?\/\//u.test(reference)) {
        throw new Error(`remote asset URL is forbidden: ${reference}`);
      }
    }
    for (const importedKey of [
      ...stringArray(entry.imports),
      ...stringArray(entry.dynamicImports),
    ]) {
      if (manifest[importedKey] === undefined) {
        throw new Error(`manifest import is unresolved: ${importedKey}`);
      }
    }
  }
}

function collectInitialFiles(
  manifest: Readonly<Record<string, ManifestEntry>>,
  entryKey: string,
): Set<string> {
  const files = new Set<string>();
  const visited = new Set<string>();
  const visit = (key: string): void => {
    if (visited.has(key)) return;
    visited.add(key);
    const entry = manifest[key];
    if (entry === undefined || typeof entry.file !== "string") {
      throw new Error(`manifest entry is invalid: ${key}`);
    }
    files.add(entry.file);
    for (const path of [
      ...stringArray(entry.css),
      ...stringArray(entry.assets),
    ]) {
      files.add(path);
    }
    for (const importedKey of stringArray(entry.imports)) visit(importedKey);
  };
  visit(entryKey);
  return files;
}

function collectHtmlReferences(distDirectory: string): ReadonlySet<string> {
  const html = readFileSync(join(distDirectory, "index.html"), "utf8");
  const files = new Set<string>();
  const attributePattern = /\b(?:src|href)\s*=\s*["']([^"']+)["']/giu;
  for (const match of html.matchAll(attributePattern)) {
    const reference = match[1];
    if (reference === undefined) continue;
    if (/^(?:https?:)?\/\//u.test(reference)) {
      throw new Error(
        `remote asset URL is forbidden in index.html: ${reference}`,
      );
    }
    if (/^(?:data:|#)/u.test(reference)) continue;
    const path = reference.split(/[?#]/u, 1)[0]?.replace(/^\//u, "");
    if (path !== undefined && path !== "") files.add(path);
  }
  return files;
}

function collectCoreFiles(distDirectory: string): Set<string> {
  const files = new Set<string>();
  const visit = (directory: string): void => {
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = join(directory, item.name);
      const projectPath = relative(distDirectory, absolutePath)
        .split(sep)
        .join("/");
      if (item.isDirectory()) {
        if (projectPath === ".vite") continue;
        visit(absolutePath);
        continue;
      }
      if (!item.isFile() || extname(item.name) === ".map") continue;
      const extension = extname(item.name).toLowerCase();
      if (!PAYLOAD_EXTENSIONS.has(extension)) {
        throw new Error(`unknown emitted extension: ${projectPath}`);
      }
      files.add(projectPath);
    }
  };
  visit(distDirectory);
  return files;
}

function validateFilesExist(
  distDirectory: string,
  files: ReadonlySet<string>,
): void {
  for (const file of files) {
    const absolutePath = join(distDirectory, file);
    if (!existsSync(absolutePath) || !statSync(absolutePath).isFile()) {
      throw new Error(`manifest file is missing: ${file}`);
    }
  }
}

function validateCssReferences(
  distDirectory: string,
  files: ReadonlySet<string>,
): void {
  const remoteReferencePattern =
    /(?:url\(\s*["']?|@import\s+(?:url\(\s*)?["']?)(?:https?:)?\/\//iu;
  for (const file of files) {
    if (extname(file).toLowerCase() !== ".css") continue;
    const css = readFileSync(join(distDirectory, file), "utf8");
    if (remoteReferencePattern.test(css)) {
      throw new Error(`remote asset URL is forbidden in ${file}.`);
    }
  }
}

function calculateMetrics(
  distDirectory: string,
  initialFiles: ReadonlySet<string>,
  coreFiles: ReadonlySet<string>,
): BudgetMetrics {
  let largestJavaScriptRawBytes = 0;
  let largestJavaScriptGzipBytes = 0;
  let initialJavaScriptGzipBytes = 0;
  let initialTextGzipBytes = 0;
  let initialPayloadBytes = 0;
  let corePayloadBytes = 0;
  let largestRasterFileBytes = 0;
  let largestAudioFileBytes = 0;

  for (const file of coreFiles) {
    const contents = readFileSync(join(distDirectory, file));
    const rawBytes = contents.byteLength;
    const extension = extname(file).toLowerCase();
    corePayloadBytes += rawBytes;
    if (extension === ".js") {
      largestJavaScriptRawBytes = Math.max(largestJavaScriptRawBytes, rawBytes);
      largestJavaScriptGzipBytes = Math.max(
        largestJavaScriptGzipBytes,
        gzipSync(contents).byteLength,
      );
    }
    if (RASTER_EXTENSIONS.has(extension)) {
      largestRasterFileBytes = Math.max(largestRasterFileBytes, rawBytes);
    }
    if (AUDIO_EXTENSIONS.has(extension)) {
      largestAudioFileBytes = Math.max(largestAudioFileBytes, rawBytes);
    }
  }

  for (const file of initialFiles) {
    const contents = readFileSync(join(distDirectory, file));
    const extension = extname(file).toLowerCase();
    if (TEXT_EXTENSIONS.has(extension)) {
      const gzipBytes = gzipSync(contents).byteLength;
      initialTextGzipBytes += gzipBytes;
      initialPayloadBytes += gzipBytes;
      if (extension === ".js") initialJavaScriptGzipBytes += gzipBytes;
    } else {
      initialPayloadBytes += contents.byteLength;
    }
  }

  return {
    largestJavaScriptRawBytes,
    largestJavaScriptGzipBytes,
    initialJavaScriptGzipBytes,
    initialTextGzipBytes,
    initialPayloadBytes,
    corePayloadBytes,
    largestRasterFileBytes,
    largestAudioFileBytes,
  };
}

function stringArray(value: unknown): readonly string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error("manifest string list is invalid.");
  }
  const strings: string[] = [];
  for (const item of value as readonly unknown[]) {
    if (typeof item !== "string") {
      throw new Error("manifest string list is invalid.");
    }
    strings.push(item);
  }
  return strings;
}

function runCli(): void {
  const result = inspectProductionBuild({
    distDirectory: resolve("dist"),
    budgetFile: resolve("performance-budgets.json"),
  });
  process.stdout.write(`${formatBudgetSummary(result)}\n`);
  if (result.violations.length > 0)
    throw new BudgetCheckError(result.violations);
  process.stdout.write("Performance budget passed.\n");
}

const invokedPath = process.argv[1];
if (
  invokedPath !== undefined &&
  import.meta.url === pathToFileURL(resolve(invokedPath)).href
) {
  try {
    runCli();
  } catch (error: unknown) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
