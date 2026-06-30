import { describe, expect, test } from "vitest";

import {
  ASSET_CATALOG_SCHEMA,
  CONTENT_MANIFEST_SCHEMA,
  CONTENT_SCHEMA_REGISTRY,
  decodeAssetCatalog,
  decodeContentManifest,
  decodeRegisteredContent,
} from "../../src/content/schema/index.ts";
import {
  decodeCanonicalToken,
  type ValidationIssueCode,
  type ValidationResult,
} from "../../src/shared/validation/index.ts";
import { parseSeedHex } from "../../src/simulation/random";
import { createRunState, hashRunState } from "../../src/simulation/run";

function validManifest(): Record<string, unknown> {
  return {
    schemaVersion: CONTENT_MANIFEST_SCHEMA,
    manifestId: "core.v1",
    contentVersion: "content.v1",
    documents: [
      {
        id: "document.z",
        schema: ASSET_CATALOG_SCHEMA,
        path: "z-catalog.json",
      },
      {
        id: "document.a",
        schema: ASSET_CATALOG_SCHEMA,
        path: "a-catalog.json",
      },
    ],
  };
}

function validImageAsset(): Record<string, unknown> {
  return {
    id: "asset.image.test.v1",
    kind: "image",
    specPath: "docs/assets/specs/asset.image.test.v1.md",
    runtimeFiles: [
      {
        path: "public/assets/core/test.webp",
        mediaType: "image/webp",
        byteLength: 4,
        sha256: "a".repeat(64),
        width: 32,
        height: 16,
      },
    ],
    license: {
      expression: "Project-owned",
      evidencePath: "docs/assets/licenses/test.md",
    },
    provenance: {
      kind: "original",
      creator: "WWIIRun",
      source: "Project source",
    },
  };
}

function validCatalog(
  assets: readonly Record<string, unknown>[] = [validImageAsset()],
): Record<string, unknown> {
  return {
    schemaVersion: ASSET_CATALOG_SCHEMA,
    catalogId: "core.assets.v1",
    assets,
  };
}

describe("content manifest v1", () => {
  test("returns a detached manifest with documents sorted by id", () => {
    const input = validManifest();
    const result = decodeContentManifest(input);

    expect(result).toEqual({
      ok: true,
      value: {
        schemaVersion: CONTENT_MANIFEST_SCHEMA,
        manifestId: "core.v1",
        contentVersion: "content.v1",
        documents: [
          {
            id: "document.a",
            schema: ASSET_CATALOG_SCHEMA,
            path: "a-catalog.json",
          },
          {
            id: "document.z",
            schema: ASSET_CATALOG_SCHEMA,
            path: "z-catalog.json",
          },
        ],
      },
    });
    if (!result.ok) throw new Error("Expected manifest to be valid.");
    expect(result.value).not.toBe(input);
    expect(result.value.documents).not.toBe(input.documents);
  });

  test("canonicalizes incidental object and document order identically", () => {
    const first = validManifest();
    const second = {
      documents: [...(first.documents as Array<Record<string, unknown>>)]
        .reverse()
        .map((item) => ({
          path: item.path,
          schema: item.schema,
          id: item.id,
        })),
      contentVersion: first.contentVersion,
      manifestId: first.manifestId,
      schemaVersion: first.schemaVersion,
    };

    expect(decodeContentManifest(second)).toEqual(decodeContentManifest(first));
  });

  test.each([
    [
      "unsupported version",
      { ...validManifest(), schemaVersion: "wwiirun.content-manifest.v2" },
      "unsupported-version",
      "/schemaVersion",
    ],
    [
      "unknown key",
      { ...validManifest(), extra: true },
      "unknown-key",
      "/extra",
    ],
    [
      "missing key",
      { schemaVersion: CONTENT_MANIFEST_SCHEMA },
      "missing-key",
      "/manifestId",
    ],
    [
      "duplicate id",
      {
        ...validManifest(),
        documents: [
          { id: "same", schema: ASSET_CATALOG_SCHEMA, path: "one.json" },
          { id: "same", schema: ASSET_CATALOG_SCHEMA, path: "two.json" },
        ],
      },
      "duplicate-id",
      "/documents/1/id",
    ],
    [
      "duplicate path",
      {
        ...validManifest(),
        documents: [
          { id: "one", schema: ASSET_CATALOG_SCHEMA, path: "same.json" },
          { id: "two", schema: ASSET_CATALOG_SCHEMA, path: "same.json" },
        ],
      },
      "invalid-path",
      "/documents/1/path",
    ],
  ] as const)("rejects %s", (_label, input, code, path) => {
    expectIssue(decodeContentManifest(input), code, path);
  });

  test("does not invoke accessors on invalid documents", () => {
    let calls = 0;
    const document = Object.defineProperty({}, "id", {
      enumerable: true,
      get: () => {
        calls += 1;
        return "secret";
      },
    });

    expect(
      decodeContentManifest({ ...validManifest(), documents: [document] }),
    ).toMatchObject({ ok: false });
    expect(calls).toBe(0);
  });
});

describe("asset catalog v1", () => {
  test("accepts the empty core catalog", () => {
    expect(decodeAssetCatalog(validCatalog([]))).toEqual({
      ok: true,
      value: {
        schemaVersion: ASSET_CATALOG_SCHEMA,
        catalogId: "core.assets.v1",
        assets: [],
      },
    });
  });

  test("copies valid assets and sorts them by id", () => {
    const image = validImageAsset();
    const audio = {
      ...validImageAsset(),
      id: "asset.audio.test.v1",
      kind: "audio",
      runtimeFiles: [
        {
          path: "public/assets/core/test.ogg",
          mediaType: "audio/ogg",
          byteLength: 2,
          sha256: "b".repeat(64),
        },
      ],
    };
    const input = validCatalog([image, audio]);

    const result = decodeAssetCatalog(input);

    expect(result).toMatchObject({
      ok: true,
      value: {
        assets: [{ id: "asset.audio.test.v1" }, { id: "asset.image.test.v1" }],
      },
    });
    if (!result.ok) throw new Error("Expected catalog to be valid.");
    expect(result.value.assets).not.toBe(input.assets);
    expect(result.value.assets[1]?.runtimeFiles).not.toBe(image.runtimeFiles);
  });

  test.each([
    [
      "image without dimensions",
      {
        ...validImageAsset(),
        runtimeFiles: [
          {
            path: "public/assets/core/test.png",
            mediaType: "image/png",
            byteLength: 1,
            sha256: "a".repeat(64),
          },
        ],
      },
      "missing-key",
      "/assets/0/runtimeFiles/0/width",
    ],
    [
      "audio with dimensions",
      {
        ...validImageAsset(),
        kind: "audio",
        runtimeFiles: [
          {
            path: "public/assets/core/test.ogg",
            mediaType: "audio/ogg",
            byteLength: 1,
            sha256: "a".repeat(64),
            width: 1,
            height: 1,
          },
        ],
      },
      "unknown-key",
      "/assets/0/runtimeFiles/0/height",
    ],
    [
      "mismatched MIME",
      {
        ...validImageAsset(),
        runtimeFiles: [
          {
            path: "public/assets/core/test.png",
            mediaType: "image/webp",
            byteLength: 1,
            sha256: "a".repeat(64),
            width: 1,
            height: 1,
          },
        ],
      },
      "invalid-value",
      "/assets/0/runtimeFiles/0/mediaType",
    ],
    [
      "empty runtime files",
      { ...validImageAsset(), runtimeFiles: [] },
      "invalid-value",
      "/assets/0/runtimeFiles",
    ],
    [
      "AI provenance without tool and prompt",
      {
        ...validImageAsset(),
        provenance: {
          kind: "ai-generated",
          creator: "WWIIRun",
          source: "Generated",
        },
      },
      "missing-key",
      "/assets/0/provenance/promptPath",
    ],
    [
      "non-AI provenance with prompt",
      {
        ...validImageAsset(),
        provenance: {
          kind: "original",
          creator: "WWIIRun",
          source: "Project source",
          promptPath: "docs/assets/prompts/test.md",
        },
      },
      "unknown-key",
      "/assets/0/provenance/promptPath",
    ],
    [
      "bad SHA-256",
      {
        ...validImageAsset(),
        runtimeFiles: [
          {
            path: "public/assets/core/test.webp",
            mediaType: "image/webp",
            byteLength: 1,
            sha256: "A".repeat(64),
            width: 1,
            height: 1,
          },
        ],
      },
      "invalid-value",
      "/assets/0/runtimeFiles/0/sha256",
    ],
    [
      "non-finite byte length",
      {
        ...validImageAsset(),
        runtimeFiles: [
          {
            path: "public/assets/core/test.webp",
            mediaType: "image/webp",
            byteLength: Number.POSITIVE_INFINITY,
            sha256: "a".repeat(64),
            width: 1,
            height: 1,
          },
        ],
      },
      "invalid-value",
      "/assets/0/runtimeFiles/0/byteLength",
    ],
  ] as const)("rejects %s", (_label, asset, code, path) => {
    expectIssue(decodeAssetCatalog(validCatalog([asset])), code, path);
  });

  test("requires both AI provenance fields", () => {
    const result = decodeAssetCatalog(
      validCatalog([
        {
          ...validImageAsset(),
          provenance: {
            kind: "ai-assisted",
            creator: "WWIIRun",
            source: "Generated",
          },
        },
      ]),
    );

    expect(result).toMatchObject({
      ok: false,
      issues: [
        { code: "missing-key", path: "/assets/0/provenance/tool" },
        { code: "missing-key", path: "/assets/0/provenance/promptPath" },
      ],
    });
  });

  test("rejects duplicate asset ids", () => {
    expectIssue(
      decodeAssetCatalog(validCatalog([validImageAsset(), validImageAsset()])),
      "duplicate-id",
      "/assets/1/id",
    );
  });
});

function expectIssue(
  result: ValidationResult<unknown>,
  code: ValidationIssueCode,
  path: string,
): void {
  if (result.ok) throw new Error("Expected validation to fail.");
  expect(
    result.issues.some((issue) => issue.code === code && issue.path === path),
  ).toBe(true);
}

describe("closed content schema registry", () => {
  test("registers the asset catalog as cosmetic", () => {
    expect(CONTENT_SCHEMA_REGISTRY[ASSET_CATALOG_SCHEMA]?.impact).toBe(
      "cosmetic",
    );
    expect(
      decodeRegisteredContent(ASSET_CATALOG_SCHEMA, validCatalog([])),
    ).toEqual(decodeAssetCatalog(validCatalog([])));
  });

  test("fails closed for an unknown schema", () => {
    expect(decodeRegisteredContent("wwiirun.gameplay.v1", {})).toEqual({
      ok: false,
      issues: [
        {
          code: "unknown-schema",
          path: "/schemaVersion",
          message: "schema is not registered.",
        },
      ],
    });
  });

  test("fails closed for an inherited registry property", () => {
    expect(() => decodeRegisteredContent("constructor", {})).not.toThrow();
    expect(decodeRegisteredContent("constructor", {})).toEqual({
      ok: false,
      issues: [
        {
          code: "unknown-schema",
          path: "/schemaVersion",
          message: "schema is not registered.",
        },
      ],
    });
  });

  test("uses the same token grammar accepted by RunConfig", () => {
    const parsed = parseSeedHex("0123456789abcdeffedcba9876543210");
    if (!parsed.ok) throw new Error("Test seed must be valid.");
    const corpus = [
      "a",
      `a${"b".repeat(63)}`,
      "contains space",
      "UPPER",
      "avião",
      `a${"b".repeat(64)}`,
      "with/slash",
    ];

    for (const token of corpus) {
      const contentAccepts = decodeCanonicalToken(token, "/token").ok;
      let runAccepts = true;
      try {
        createRunState({
          mode: "daily",
          seed: parsed.value,
          rulesetVersion: token,
          contentVersion: "content.v1",
          aircraftId: "aircraft.test.v1",
          loadoutId: "loadout.test.v1",
          modifierIds: [],
        });
      } catch {
        runAccepts = false;
      }
      expect(contentAccepts, token).toBe(runAccepts);
    }
  });

  test("cosmetic catalog data cannot alter the existing run hash", () => {
    const parsed = parseSeedHex("0123456789abcdeffedcba9876543210");
    if (!parsed.ok) throw new Error("Test seed must be valid.");
    const state = createRunState({
      mode: "daily",
      seed: parsed.value,
      rulesetVersion: "rules.v1",
      contentVersion: "content.v1",
      aircraftId: "aircraft.test.v1",
      loadoutId: "loadout.test.v1",
      modifierIds: [],
    });
    const before = hashRunState(state);

    expect(decodeAssetCatalog(validCatalog([])).ok).toBe(true);
    expect(decodeAssetCatalog(validCatalog([validImageAsset()])).ok).toBe(true);
    expect(hashRunState(state)).toBe(before);
  });
});
