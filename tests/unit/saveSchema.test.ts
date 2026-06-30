import { describe, expect, test } from "vitest";

import {
  SAVE_SCHEMA_VERSION,
  decodeSaveDocument,
  migrateSaveDocument,
} from "../../src/services/save/index.ts";
import type {
  ValidationIssueCode,
  ValidationResult,
} from "../../src/shared/validation/index.ts";

describe("save document v1", () => {
  test("decodes and migrates the strict v1 envelope", () => {
    const input = { schemaVersion: 1 };

    const decoded = decodeSaveDocument(input);
    const migrated = migrateSaveDocument(input);

    expect(SAVE_SCHEMA_VERSION).toBe(1);
    expect(decoded).toEqual({ ok: true, value: { schemaVersion: 1 } });
    expect(migrated).toEqual(decoded);
    if (!decoded.ok || !migrated.ok) throw new Error("Expected valid save.");
    expect(decoded.value).not.toBe(input);
    expect(migrated.value).not.toBe(input);
  });

  test.each([
    ["missing version", {}, "missing-key", "/schemaVersion"],
    [
      "unknown key",
      { schemaVersion: 1, profile: {} },
      "unknown-key",
      "/profile",
    ],
    [
      "noninteger version",
      { schemaVersion: 1.5 },
      "invalid-value",
      "/schemaVersion",
    ],
    [
      "string version",
      { schemaVersion: "1" },
      "invalid-type",
      "/schemaVersion",
    ],
    [
      "implicit v0",
      { schemaVersion: 0 },
      "unsupported-version",
      "/schemaVersion",
    ],
    [
      "future version",
      { schemaVersion: 2 },
      "unsupported-version",
      "/schemaVersion",
    ],
  ] as const)(
    "rejects %s without changing the raw value",
    (_label, input, code, path) => {
      const before = structuredClone(input);

      expectIssue(decodeSaveDocument(input), code, path);
      expectIssue(migrateSaveDocument(input), code, path);
      expect(input).toEqual(before);
    },
  );

  test("does not invoke accessors or mutate corrupt input", () => {
    let getterCalls = 0;
    const input = Object.defineProperty({}, "schemaVersion", {
      enumerable: true,
      get: () => {
        getterCalls += 1;
        return 1;
      },
    });

    expect(() => decodeSaveDocument(input)).not.toThrow();
    expect(() => migrateSaveDocument(input)).not.toThrow();
    expect(decodeSaveDocument(input)).toMatchObject({ ok: false });
    expect(migrateSaveDocument(input)).toMatchObject({ ok: false });
    expect(getterCalls).toBe(0);
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
