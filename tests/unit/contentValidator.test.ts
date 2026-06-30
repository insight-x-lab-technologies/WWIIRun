import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

import {
  formatContentDiagnostics,
  validateContentSet,
  type ContentDiagnostic,
} from "../../scripts/validateContent.ts";
import type { ValidationIssueCode } from "../../src/shared/validation/index.ts";

type JsonObject = Record<string, unknown>;

function createRepository(): {
  readonly root: string;
  readonly manifestPath: string;
  readonly catalogPath: string;
} {
  const root = mkdtempSync(join(tmpdir(), "wwiirun-content-"));
  const dataDirectory = join(root, "src/content/data/core");
  mkdirSync(dataDirectory, { recursive: true });
  const manifestPath = join(dataDirectory, "manifest.json");
  const catalogPath = join(dataDirectory, "asset-catalog.json");
  writeJson(manifestPath, validManifest());
  writeJson(catalogPath, validCatalog());
  return { root, manifestPath, catalogPath };
}

function validManifest(path = "asset-catalog.json"): JsonObject {
  return {
    schemaVersion: "wwiirun.content-manifest.v1",
    manifestId: "core.v1",
    contentVersion: "content.v1",
    documents: [
      {
        id: "core.assets.v1",
        schema: "wwiirun.asset-catalog.v1",
        path,
      },
    ],
  };
}

function validCatalog(assets: readonly JsonObject[] = []): JsonObject {
  return {
    schemaVersion: "wwiirun.asset-catalog.v1",
    catalogId: "core.assets.v1",
    assets,
  };
}

function validAsset(root: string): JsonObject {
  const bytes = Buffer.from([1, 2, 3, 4]);
  const specPath = "docs/assets/specs/test.md";
  const evidencePath = "docs/assets/licenses/test.md";
  const runtimePath = "public/assets/core/test.png";
  writeFile(root, specPath, "# Test asset\n");
  writeFile(root, evidencePath, "Project-owned\n");
  writeFile(root, runtimePath, bytes);
  return {
    id: "asset.test.v1",
    kind: "image",
    specPath,
    runtimeFiles: [
      {
        path: runtimePath,
        mediaType: "image/png",
        byteLength: bytes.byteLength,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        width: 1,
        height: 1,
      },
    ],
    license: { expression: "Project-owned", evidencePath },
    provenance: {
      kind: "original",
      creator: "WWIIRun",
      source: "Project source",
    },
  };
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function writeFile(
  root: string,
  path: string,
  value: string | Uint8Array,
): void {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, value);
}

describe("content build validator", () => {
  test("accepts a valid manifest and empty catalog", () => {
    const repository = createRepository();

    expect(validateContentSet(repository)).toEqual([]);
  });

  test("validates complete asset references, size, and SHA-256", () => {
    const repository = createRepository();
    writeJson(
      repository.catalogPath,
      validCatalog([validAsset(repository.root)]),
    );

    expect(validateContentSet(repository)).toEqual([]);
  });

  test("aggregates missing, orphan, JSON, schema, and integrity diagnostics", () => {
    const repository = createRepository();
    const asset = validAsset(repository.root);
    const runtimeFiles = asset.runtimeFiles as JsonObject[];
    runtimeFiles[0] = {
      ...runtimeFiles[0],
      byteLength: 999,
      sha256: "0".repeat(64),
    };
    asset.specPath = "docs/assets/specs/missing.md";
    writeJson(repository.catalogPath, validCatalog([asset]));
    writeFileSync(
      join(dirname(repository.manifestPath), "orphan.json"),
      "{ not-json }\n",
    );

    const diagnostics = validateContentSet(repository);

    expectDiagnostic(
      diagnostics,
      "missing-reference",
      "/assets/0/specPath",
      "src/content/data/core/asset-catalog.json",
    );
    expectDiagnostic(
      diagnostics,
      "integrity-mismatch",
      "/assets/0/runtimeFiles/0/byteLength",
    );
    expectDiagnostic(
      diagnostics,
      "integrity-mismatch",
      "/assets/0/runtimeFiles/0/sha256",
    );
    expectDiagnostic(
      diagnostics,
      "missing-reference",
      "",
      "src/content/data/core/orphan.json",
    );
    expect(formatContentDiagnostics(diagnostics)).toContain(
      "asset-catalog.json/assets/0/runtimeFiles/0/sha256 [integrity-mismatch]",
    );
  });

  test("rejects missing documents and unknown schemas", () => {
    const repository = createRepository();
    const manifest = validManifest("missing.json");
    const documents = manifest.documents as JsonObject[];
    documents[0] = { ...documents[0], schema: "wwiirun.unknown.v1" };
    writeJson(repository.manifestPath, manifest);

    const diagnostics = validateContentSet(repository);

    expectDiagnostic(diagnostics, "unknown-schema", "/documents/0/schema");
    expectDiagnostic(diagnostics, "missing-reference", "/documents/0/path");
  });

  test("rejects inherited registry properties and keeps aggregating", () => {
    const repository = createRepository();
    writeJson(repository.manifestPath, {
      ...validManifest(),
      documents: [
        {
          id: "a.constructor",
          schema: "constructor",
          path: "asset-catalog.json",
        },
        {
          id: "z.unknown",
          schema: "wwiirun.unknown.v1",
          path: "missing.json",
        },
      ],
    });

    const diagnostics = validateContentSet(repository);

    expectDiagnostic(diagnostics, "unknown-schema", "/documents/0/schema");
    expectDiagnostic(diagnostics, "unknown-schema", "/documents/1/schema");
    expectDiagnostic(diagnostics, "missing-reference", "/documents/1/path");
  });

  test("reports manifest diagnostics at source positions after canonicalization", () => {
    const repository = createRepository();
    writeJson(repository.manifestPath, {
      ...validManifest(),
      documents: [
        {
          id: "z.unknown",
          schema: "wwiirun.unknown.v1",
          path: "missing.json",
        },
        {
          id: "a.catalog",
          schema: "wwiirun.asset-catalog.v1",
          path: "asset-catalog.json",
        },
      ],
    });

    const diagnostics = validateContentSet(repository);

    expectDiagnostic(diagnostics, "unknown-schema", "/documents/0/schema");
    expectDiagnostic(diagnostics, "missing-reference", "/documents/0/path");
    expect(
      diagnostics.some((diagnostic) =>
        diagnostic.issue.path.startsWith("/documents/1"),
      ),
    ).toBe(false);
  });

  test("reports asset diagnostics at source positions after canonicalization", () => {
    const repository = createRepository();
    const sourceFirst = {
      ...validAsset(repository.root),
      id: "z.asset",
      specPath: "docs/assets/specs/missing.md",
    };
    const sourceSecond = {
      ...validAsset(repository.root),
      id: "a.asset",
    };
    writeJson(
      repository.catalogPath,
      validCatalog([sourceFirst, sourceSecond]),
    );

    const diagnostics = validateContentSet(repository);

    expectDiagnostic(diagnostics, "missing-reference", "/assets/0/specPath");
    expect(
      diagnostics.some(
        (diagnostic) => diagnostic.issue.path === "/assets/1/specPath",
      ),
    ).toBe(false);
  });

  test("rejects invalid JSON and an internal schema discriminant mismatch", () => {
    const repository = createRepository();
    writeFileSync(repository.catalogPath, "{ not-json }\n");

    expectDiagnostic(
      validateContentSet(repository),
      "invalid-value",
      "",
      "src/content/data/core/asset-catalog.json",
    );

    writeJson(repository.catalogPath, {
      ...validCatalog(),
      schemaVersion: "wwiirun.content-manifest.v1",
    });

    expectDiagnostic(
      validateContentSet(repository),
      "unsupported-version",
      "/schemaVersion",
      "src/content/data/core/asset-catalog.json",
    );
  });

  test("rejects document symlinks that escape the manifest directory", () => {
    const repository = createRepository();
    const outside = join(repository.root, "outside.json");
    writeJson(outside, validCatalog());
    const linked = join(dirname(repository.manifestPath), "linked.json");
    symlinkSync(outside, linked);
    writeJson(repository.manifestPath, validManifest("linked.json"));

    expectDiagnostic(
      validateContentSet(repository),
      "invalid-path",
      "/documents/0/path",
    );
  });

  test("rejects a manifest symlink that escapes the repository", () => {
    const repository = createRepository();
    const externalDirectory = mkdtempSync(join(tmpdir(), "wwiirun-external-"));
    const externalManifest = join(externalDirectory, "manifest.json");
    writeJson(externalManifest, validManifest());
    const linkedManifest = join(
      dirname(repository.manifestPath),
      "linked-manifest.json",
    );
    symlinkSync(externalManifest, linkedManifest);

    expectDiagnostic(
      validateContentSet({
        root: repository.root,
        manifestPath: linkedManifest,
      }),
      "invalid-path",
      "",
    );
  });

  test("rejects runtime files outside public/assets/core and symlink escapes", () => {
    const repository = createRepository();
    const asset = validAsset(repository.root);
    const runtimeFiles = asset.runtimeFiles as JsonObject[];
    const outsidePath = "private/test.png";
    writeFile(repository.root, outsidePath, Buffer.from([1, 2, 3, 4]));
    runtimeFiles[0] = { ...runtimeFiles[0], path: outsidePath };
    writeJson(repository.catalogPath, validCatalog([asset]));

    expectDiagnostic(
      validateContentSet(repository),
      "invalid-path",
      "/assets/0/runtimeFiles/0/path",
    );

    const external = join(repository.root, "external.png");
    writeFileSync(external, Buffer.from([1, 2, 3, 4]));
    const linked = join(repository.root, "public/assets/core/linked.png");
    symlinkSync(external, linked);
    runtimeFiles[0] = {
      ...runtimeFiles[0],
      path: "public/assets/core/linked.png",
    };
    writeJson(repository.catalogPath, validCatalog([asset]));

    expectDiagnostic(
      validateContentSet(repository),
      "invalid-path",
      "/assets/0/runtimeFiles/0/path",
    );
  });
});

describe("content validator CLI", () => {
  test("returns stable exit codes and streams for versioned fixtures", () => {
    const script = fileURLToPath(
      new URL("../../scripts/validateContent.ts", import.meta.url),
    );
    const valid = spawnSync(
      process.execPath,
      [script, "tests/fixtures/content-valid/manifest.json"],
      { cwd: tmpdir(), encoding: "utf8" },
    );
    const invalid = spawnSync(
      process.execPath,
      [script, "tests/fixtures/content-invalid/manifest.json"],
      { cwd: tmpdir(), encoding: "utf8" },
    );

    if (
      isSandboxSpawnBlocked(valid.error) ||
      isSandboxSpawnBlocked(invalid.error)
    ) {
      expect(valid.error ?? invalid.error).toBeDefined();
      return;
    }

    expect(valid.status).toBe(0);
    expect(valid.stdout).toContain("Validated 1 content document");
    expect(valid.stderr).toBe("");
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toBe("");
    expect(invalid.stderr).toContain(
      "tests/fixtures/content-invalid/asset-catalog.json/unexpected [unknown-key]",
    );
  });

  test("reports inherited schema names without converting them to I/O errors", () => {
    const script = fileURLToPath(
      new URL("../../scripts/validateContent.ts", import.meta.url),
    );
    const result = spawnSync(
      process.execPath,
      [script, "tests/fixtures/content-inherited-schema/manifest.json"],
      { cwd: tmpdir(), encoding: "utf8" },
    );

    if (isSandboxSpawnBlocked(result.error)) {
      expect(result.error).toBeDefined();
      return;
    }

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(
      "manifest.json/documents/0/schema [unknown-schema]",
    );
    expect(result.stderr).toContain(
      "manifest.json/documents/1/schema [unknown-schema]",
    );
    expect(result.stderr).toContain(
      "manifest.json/documents/1/path [missing-reference]",
    );
    expect(result.stderr).not.toContain("[io-error]");
  });

  test("rejects more than one argument and paths outside the repository", () => {
    const script = fileURLToPath(
      new URL("../../scripts/validateContent.ts", import.meta.url),
    );
    const tooMany = spawnSync(process.execPath, [script, "one", "two"], {
      encoding: "utf8",
    });
    const outside = spawnSync(
      process.execPath,
      [script, resolve("/tmp/out.json")],
      {
        encoding: "utf8",
      },
    );

    if (
      isSandboxSpawnBlocked(tooMany.error) ||
      isSandboxSpawnBlocked(outside.error)
    ) {
      expect(tooMany.error ?? outside.error).toBeDefined();
      return;
    }

    expect(tooMany.status).toBe(1);
    expect(tooMany.stderr).toContain("accepts at most one manifest path");
    expect(outside.status).toBe(1);
    expect(outside.stderr).toContain("must stay within the repository");
  });

  test("fixtures remain explicit JSON documents", () => {
    const path = resolve(
      import.meta.dirname,
      "../fixtures/content-valid/manifest.json",
    );
    expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({
      manifestId: "fixture.valid.v1",
    });
  });
});

function isSandboxSpawnBlocked(error: Error | undefined): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === "EPERM";
}

function expectDiagnostic(
  diagnostics: readonly ContentDiagnostic[],
  code: ValidationIssueCode,
  path: string,
  file?: string,
): void {
  expect(
    diagnostics.some(
      (diagnostic) =>
        diagnostic.issue.code === code &&
        diagnostic.issue.path === path &&
        (file === undefined || diagnostic.file === file),
    ),
  ).toBe(true);
}
