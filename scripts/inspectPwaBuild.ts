import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parsePublicBasePath } from "../src/platform/pwa/config.ts";

export function inspectPwaBuild(options: {
  readonly distDirectory: string;
  readonly basePath: string;
}): readonly string[] {
  const basePath = parsePublicBasePath(options.basePath);
  const distDirectory = resolve(options.distDirectory);
  const violations: string[] = [];
  const indexPath = join(distDirectory, "index.html");
  const manifestPath = join(distDirectory, "manifest.webmanifest");
  const workerPath = join(distDirectory, "sw.js");

  if (!existsSync(indexPath)) violations.push("index.html is missing.");
  if (!existsSync(manifestPath))
    violations.push("manifest.webmanifest is missing.");
  if (!existsSync(workerPath)) violations.push("sw.js is missing.");
  if (violations.length > 0) return violations;

  const index = readFileSync(indexPath, "utf8");
  for (const reference of htmlReferences(index)) {
    if (reference.startsWith("/") && !reference.startsWith(basePath)) {
      violations.push(
        `index.html contains a root-relative reference outside ${basePath}: ${reference}`,
      );
    }
  }

  const manifest = readManifest(manifestPath);
  for (const field of ["id", "start_url", "scope"] as const) {
    if (manifest[field] !== basePath) {
      violations.push(`manifest ${field} must equal ${basePath}.`);
    }
  }
  const iconsValid = requiredIconsPresent(
    manifest.icons,
    basePath,
    distDirectory,
  );
  if (!iconsValid) {
    violations.push(
      "manifest must declare PNG icons for 192x192, 512x512, and maskable 512x512.",
    );
  }

  const worker = readFileSync(workerPath, "utf8");
  const precacheUrls = new Set<string>();
  for (const match of worker.matchAll(/\burl\s*:\s*["']([^"']+)["']/gu)) {
    const url = match[1];
    if (url === undefined) continue;
    if (precacheUrls.has(url)) {
      violations.push(
        `service worker precache contains duplicate URL: ${url}.`,
      );
      continue;
    }
    precacheUrls.add(url);
  }
  if (
    /\b(?:NetworkFirst|CacheFirst|StaleWhileRevalidate|NetworkOnly|CacheOnly)\b/u.test(
      worker,
    )
  ) {
    violations.push(
      "service worker must not configure runtime cache strategies.",
    );
  }
  return violations;
}

type Manifest = {
  readonly id?: unknown;
  readonly start_url?: unknown;
  readonly scope?: unknown;
  readonly icons?: unknown;
};

function readManifest(path: string): Manifest {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"));
    return typeof value === "object" && value !== null ? value : {};
  } catch {
    return {};
  }
}

function htmlReferences(html: string): readonly string[] {
  return [...html.matchAll(/\b(?:href|src)=["']([^"']+)["']/giu)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined);
}

function requiredIconsPresent(
  value: unknown,
  basePath: string,
  distDirectory: string,
): boolean {
  if (!Array.isArray(value)) return false;
  const icons = value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === "object" && item !== null,
  );
  const has = (sizes: string, purpose: string): boolean =>
    icons.some((icon) => {
      const src = icon.src;
      if (
        icon.sizes !== sizes ||
        icon.type !== "image/png" ||
        icon.purpose !== purpose ||
        typeof src !== "string" ||
        !src.startsWith(basePath)
      ) {
        return false;
      }
      return existsSync(join(distDirectory, src.slice(basePath.length)));
    });
  return (
    has("192x192", "any") && has("512x512", "any") && has("512x512", "maskable")
  );
}

const scriptPath = process.argv[1];
if (
  scriptPath !== undefined &&
  import.meta.url === pathToFileURL(resolve(scriptPath)).href
) {
  const scriptDirectory = dirname(fileURLToPath(import.meta.url));
  const repositoryRoot = resolve(scriptDirectory, "..");
  const basePath = process.env.WWIIRUN_BASE_PATH ?? "/";
  const violations = inspectPwaBuild({
    distDirectory: join(repositoryRoot, "dist"),
    basePath,
  });
  if (violations.length > 0) {
    // eslint-disable-next-line no-console -- CLI diagnostics are the command output.
    console.error(`PWA build inspection failed:\n- ${violations.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    // eslint-disable-next-line no-console -- CLI success is the command output.
    console.log(`PWA build inspection passed for ${basePath}.`);
  }
}
