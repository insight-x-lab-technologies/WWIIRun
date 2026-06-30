import { createHash } from "node:crypto";
import {
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
} from "node:fs";
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

import {
  ASSET_CATALOG_SCHEMA,
  decodeAssetCatalog,
  decodeContentManifest,
  getContentSchemaRegistration,
  type AssetCatalogV1,
  type AssetDescriptorV1,
  type ContentManifestV1,
} from "../src/content/schema/index.ts";
import type {
  ValidationIssue,
  ValidationIssueCode,
} from "../src/shared/validation/index.ts";

export type ContentDiagnostic = {
  readonly file: string;
  readonly issue: ValidationIssue;
};

export type ContentValidationOptions = {
  readonly root: string;
  readonly manifestPath: string;
};

type ParsedJson =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly diagnostic: ContentDiagnostic };

type ResolvedFile =
  | { readonly ok: true; readonly path: string }
  | { readonly ok: false; readonly issue: ValidationIssue };

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = resolve(dirname(SCRIPT_PATH), "..");
const DEFAULT_MANIFEST_PATH = resolve(
  REPOSITORY_ROOT,
  "src/content/data/core/manifest.json",
);

export function validateContentSet(
  options: ContentValidationOptions,
): readonly ContentDiagnostic[] {
  const root = resolve(options.root);
  const manifestPath = resolve(options.manifestPath);
  const diagnostics: ContentDiagnostic[] = [];
  if (!isPathInside(root, manifestPath)) {
    diagnostics.push(
      diagnostic(
        root,
        manifestPath,
        "invalid-path",
        "",
        "manifest must stay within the repository.",
      ),
    );
    return sortDiagnostics(diagnostics);
  }

  const resolvedManifest = resolveRegularFile(
    root,
    relative(root, manifestPath),
    root,
    "",
  );
  if (!resolvedManifest.ok) {
    return [
      {
        file: relativeFile(root, manifestPath),
        issue: resolvedManifest.issue,
      },
    ];
  }
  const authoritativeManifestPath = resolvedManifest.path;

  const parsedManifest = readJson(root, authoritativeManifestPath, "");
  if (!parsedManifest.ok) return [parsedManifest.diagnostic];
  const manifestResult = decodeContentManifest(parsedManifest.value);
  if (!manifestResult.ok) {
    diagnostics.push(
      ...manifestResult.issues.map((issue) => ({
        file: relativeFile(root, authoritativeManifestPath),
        issue,
      })),
    );
    return sortDiagnostics(diagnostics);
  }

  validateDocuments(
    root,
    authoritativeManifestPath,
    manifestResult.value,
    sourceIndexesById(parsedManifest.value, "documents"),
    diagnostics,
  );
  validateOrphans(
    root,
    authoritativeManifestPath,
    manifestResult.value,
    diagnostics,
  );
  return sortDiagnostics(diagnostics);
}

export function formatContentDiagnostics(
  diagnostics: readonly ContentDiagnostic[],
): string {
  return diagnostics
    .map(
      ({ file, issue }) =>
        `${file}${issue.path} [${issue.code}] ${issue.message}`,
    )
    .join("\n");
}

function validateDocuments(
  root: string,
  manifestPath: string,
  manifest: ContentManifestV1,
  sourceIndexes: ReadonlyMap<string, number>,
  diagnostics: ContentDiagnostic[],
): void {
  const manifestDirectory = dirname(manifestPath);
  for (
    let canonicalIndex = 0;
    canonicalIndex < manifest.documents.length;
    canonicalIndex += 1
  ) {
    const document = manifest.documents[canonicalIndex];
    if (document === undefined) continue;
    const sourceIndex = sourceIndexes.get(document.id) ?? canonicalIndex;
    const schemaRegistration = getContentSchemaRegistration(document.schema);
    if (schemaRegistration === undefined) {
      diagnostics.push({
        file: relativeFile(root, manifestPath),
        issue: {
          code: "unknown-schema",
          path: `/documents/${sourceIndex}/schema`,
          message: "schema is not registered.",
        },
      });
    }

    const resolved = resolveRegularFile(
      manifestDirectory,
      document.path,
      manifestDirectory,
      `/documents/${sourceIndex}/path`,
    );
    if (!resolved.ok) {
      diagnostics.push({
        file: relativeFile(root, manifestPath),
        issue: resolved.issue,
      });
      continue;
    }
    if (extname(resolved.path) !== ".json") {
      diagnostics.push({
        file: relativeFile(root, manifestPath),
        issue: {
          code: "invalid-path",
          path: `/documents/${sourceIndex}/path`,
          message: "document must be a .json regular file.",
        },
      });
      continue;
    }

    const parsed = readJson(root, resolved.path, "");
    if (!parsed.ok) {
      diagnostics.push(parsed.diagnostic);
      continue;
    }
    if (schemaRegistration === undefined) continue;

    const decoded = schemaRegistration.decode(parsed.value);
    if (!decoded.ok) {
      diagnostics.push(
        ...decoded.issues.map((issue) => ({
          file: relativeFile(root, resolved.path),
          issue,
        })),
      );
      continue;
    }
    if (document.schema === ASSET_CATALOG_SCHEMA) {
      const catalog = decodeAssetCatalog(parsed.value);
      if (catalog.ok) {
        validateAssetCatalog(
          root,
          resolved.path,
          catalog.value,
          sourceIndexesById(parsed.value, "assets"),
          diagnostics,
        );
      }
    }
  }
}

function validateAssetCatalog(
  root: string,
  catalogPath: string,
  catalog: AssetCatalogV1,
  sourceIndexes: ReadonlyMap<string, number>,
  diagnostics: ContentDiagnostic[],
): void {
  for (
    let assetIndex = 0;
    assetIndex < catalog.assets.length;
    assetIndex += 1
  ) {
    const asset = catalog.assets[assetIndex];
    if (asset === undefined) continue;
    const sourceIndex = sourceIndexes.get(asset.id) ?? assetIndex;
    const basePath = `/assets/${sourceIndex}`;
    validateRepositoryFile(
      root,
      catalogPath,
      asset.specPath,
      `${basePath}/specPath`,
      diagnostics,
    );
    validateRepositoryFile(
      root,
      catalogPath,
      asset.license.evidencePath,
      `${basePath}/license/evidencePath`,
      diagnostics,
    );
    if (asset.provenance.promptPath !== undefined) {
      validateRepositoryFile(
        root,
        catalogPath,
        asset.provenance.promptPath,
        `${basePath}/provenance/promptPath`,
        diagnostics,
      );
    }
    validateRuntimeFiles(root, catalogPath, asset, sourceIndex, diagnostics);
  }
}

function sourceIndexesById(
  value: unknown,
  collectionKey: "documents" | "assets",
): ReadonlyMap<string, number> {
  const indexes = new Map<string, number>();
  if (typeof value !== "object" || value === null) return indexes;
  const collectionValue = (value as Record<string, unknown>)[collectionKey];
  if (!Array.isArray(collectionValue)) return indexes;
  const collection = collectionValue as readonly unknown[];
  for (let index = 0; index < collection.length; index += 1) {
    const entry: unknown = collection[index];
    if (typeof entry !== "object" || entry === null) continue;
    const id = (entry as Record<string, unknown>).id;
    if (typeof id === "string") indexes.set(id, index);
  }
  return indexes;
}

function validateRuntimeFiles(
  root: string,
  catalogPath: string,
  asset: AssetDescriptorV1,
  assetIndex: number,
  diagnostics: ContentDiagnostic[],
): void {
  const runtimeRoot = resolve(root, "public/assets/core");
  for (
    let fileIndex = 0;
    fileIndex < asset.runtimeFiles.length;
    fileIndex += 1
  ) {
    const file = asset.runtimeFiles[fileIndex];
    if (file === undefined) continue;
    const basePath = `/assets/${assetIndex}/runtimeFiles/${fileIndex}`;
    const candidate = resolve(root, file.path);
    if (!isPathInside(runtimeRoot, candidate)) {
      diagnostics.push({
        file: relativeFile(root, catalogPath),
        issue: {
          code: "invalid-path",
          path: `${basePath}/path`,
          message: "runtime file must stay under public/assets/core.",
        },
      });
      continue;
    }
    const resolved = resolveRegularFile(
      root,
      file.path,
      runtimeRoot,
      `${basePath}/path`,
    );
    if (!resolved.ok) {
      diagnostics.push({
        file: relativeFile(root, catalogPath),
        issue: resolved.issue,
      });
      continue;
    }

    const bytes = readFileSync(resolved.path);
    if (bytes.byteLength !== file.byteLength) {
      diagnostics.push({
        file: relativeFile(root, catalogPath),
        issue: {
          code: "integrity-mismatch",
          path: `${basePath}/byteLength`,
          message: `declared ${file.byteLength} bytes but found ${bytes.byteLength}.`,
        },
      });
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (sha256 !== file.sha256) {
      diagnostics.push({
        file: relativeFile(root, catalogPath),
        issue: {
          code: "integrity-mismatch",
          path: `${basePath}/sha256`,
          message: "declared SHA-256 does not match the runtime file.",
        },
      });
    }
  }
}

function validateRepositoryFile(
  root: string,
  diagnosticFile: string,
  path: string,
  pointer: string,
  diagnostics: ContentDiagnostic[],
): void {
  const resolved = resolveRegularFile(root, path, root, pointer);
  if (!resolved.ok) {
    diagnostics.push({
      file: relativeFile(root, diagnosticFile),
      issue: resolved.issue,
    });
  }
}

function validateOrphans(
  root: string,
  manifestPath: string,
  manifest: ContentManifestV1,
  diagnostics: ContentDiagnostic[],
): void {
  const directory = dirname(manifestPath);
  const listed = new Set(
    manifest.documents.map((document) => resolve(directory, document.path)),
  );
  listed.add(manifestPath);
  for (const jsonPath of collectJsonFiles(directory)) {
    if (!listed.has(jsonPath)) {
      diagnostics.push({
        file: relativeFile(root, jsonPath),
        issue: {
          code: "missing-reference",
          path: "",
          message: "JSON document is not listed by the content manifest.",
        },
      });
    }
  }
}

function collectJsonFiles(directory: string): readonly string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectJsonFiles(path));
    else if (
      (entry.isFile() || entry.isSymbolicLink()) &&
      extname(entry.name) === ".json"
    ) {
      files.push(path);
    }
  }
  return files.sort(asciiCompare);
}

function resolveRegularFile(
  base: string,
  relativePath: string,
  allowedRoot: string,
  pointer: string,
): ResolvedFile {
  const candidate = resolve(base, relativePath);
  if (!isPathInside(allowedRoot, candidate)) {
    return {
      ok: false,
      issue: {
        code: "invalid-path",
        path: pointer,
        message: "path escapes its authorized root.",
      },
    };
  }
  try {
    lstatSync(candidate);
  } catch {
    return {
      ok: false,
      issue: {
        code: "missing-reference",
        path: pointer,
        message: "referenced file does not exist.",
      },
    };
  }
  try {
    const realPath = realpathSync(candidate);
    if (!isPathInside(allowedRoot, realPath)) {
      return {
        ok: false,
        issue: {
          code: "invalid-path",
          path: pointer,
          message: "symlink escapes its authorized root.",
        },
      };
    }
    if (!statSync(realPath).isFile()) {
      return {
        ok: false,
        issue: {
          code: "missing-reference",
          path: pointer,
          message: "reference must resolve to a regular file.",
        },
      };
    }
    return { ok: true, path: realPath };
  } catch {
    return {
      ok: false,
      issue: {
        code: "missing-reference",
        path: pointer,
        message: "referenced file could not be read.",
      },
    };
  }
}

function readJson(root: string, path: string, pointer: string): ParsedJson {
  let source: string;
  try {
    source = readFileSync(path, "utf8");
  } catch {
    return {
      ok: false,
      diagnostic: diagnostic(
        root,
        path,
        "missing-reference",
        pointer,
        "JSON file could not be read.",
      ),
    };
  }
  try {
    return { ok: true, value: JSON.parse(source) as unknown };
  } catch {
    return {
      ok: false,
      diagnostic: diagnostic(
        root,
        path,
        "invalid-value",
        pointer,
        "file must contain valid JSON.",
      ),
    };
  }
}

function diagnostic(
  root: string,
  file: string,
  code: ValidationIssueCode,
  path: string,
  message: string,
): ContentDiagnostic {
  return { file: relativeFile(root, file), issue: { code, path, message } };
}

function sortDiagnostics(
  diagnostics: readonly ContentDiagnostic[],
): readonly ContentDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const byFile = asciiCompare(left.file, right.file);
    if (byFile !== 0) return byFile;
    const byPath = asciiCompare(left.issue.path, right.issue.path);
    return byPath !== 0
      ? byPath
      : asciiCompare(left.issue.code, right.issue.code);
  });
}

function isPathInside(root: string, candidate: string): boolean {
  const value = relative(resolve(root), resolve(candidate));
  return (
    value === "" ||
    (!value.startsWith(`..${sep}`) && value !== ".." && !isAbsolute(value))
  );
}

function relativeFile(root: string, path: string): string {
  return relative(root, path).split(sep).join("/");
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function runCli(args: readonly string[]): number {
  if (args.length > 1) {
    process.stderr.write(
      "content:validate accepts at most one manifest path.\n",
    );
    return 1;
  }
  const manifestPath =
    args[0] === undefined
      ? DEFAULT_MANIFEST_PATH
      : isAbsolute(args[0])
        ? resolve(args[0])
        : resolve(REPOSITORY_ROOT, args[0]);
  if (!isPathInside(REPOSITORY_ROOT, manifestPath)) {
    process.stderr.write("manifest path must stay within the repository.\n");
    return 1;
  }

  try {
    const diagnostics = validateContentSet({
      root: REPOSITORY_ROOT,
      manifestPath,
    });
    if (diagnostics.length > 0) {
      process.stderr.write(`${formatContentDiagnostics(diagnostics)}\n`);
      return 1;
    }
    const parsed = readJson(REPOSITORY_ROOT, manifestPath, "");
    if (!parsed.ok) {
      process.stderr.write(
        `${formatContentDiagnostics([parsed.diagnostic])}\n`,
      );
      return 1;
    }
    const manifest = decodeContentManifest(parsed.value);
    if (!manifest.ok) return 1;
    const count = manifest.value.documents.length;
    process.stdout.write(
      `Validated ${count} content document${count === 1 ? "" : "s"}.\n`,
    );
    return 0;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "unknown I/O error";
    process.stderr.write(`[io-error] ${message}\n`);
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = runCli(process.argv.slice(2));
}
