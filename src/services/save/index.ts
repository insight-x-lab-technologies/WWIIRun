import {
  decodeExactObject,
  type ValidationResult,
} from "../../shared/validation/index.ts";

export const SAVE_SCHEMA_VERSION = 1 as const;

export type SaveDocumentV1 = {
  readonly schemaVersion: typeof SAVE_SCHEMA_VERSION;
};

export function decodeSaveDocument(
  value: unknown,
): ValidationResult<SaveDocumentV1> {
  try {
    const object = decodeExactObject(value, "", ["schemaVersion"], []);
    if (!object.ok) return object;
    const version = decodeVersion(object.value.schemaVersion);
    if (!version.ok) return version;
    return { ok: true, value: { schemaVersion: SAVE_SCHEMA_VERSION } };
  } catch {
    return invalidValueAtRoot();
  }
}

export function migrateSaveDocument(
  value: unknown,
): ValidationResult<SaveDocumentV1> {
  try {
    const object = decodeExactObject(value, "", ["schemaVersion"], []);
    if (!object.ok) return object;
    const version = decodeVersion(object.value.schemaVersion);
    if (!version.ok) return version;

    switch (version.value) {
      case 1:
        return decodeSaveDocument(value);
    }
  } catch {
    return invalidValueAtRoot();
  }
}

function decodeVersion(
  value: unknown,
): ValidationResult<typeof SAVE_SCHEMA_VERSION> {
  if (typeof value !== "number") {
    return {
      ok: false,
      issues: [
        {
          code: "invalid-type",
          path: "/schemaVersion",
          message: "must be a number.",
        },
      ],
    };
  }
  if (!Number.isSafeInteger(value)) {
    return {
      ok: false,
      issues: [
        {
          code: "invalid-value",
          path: "/schemaVersion",
          message: "must be an integer schema version.",
        },
      ],
    };
  }
  if (value !== SAVE_SCHEMA_VERSION) {
    return {
      ok: false,
      issues: [
        {
          code: "unsupported-version",
          path: "/schemaVersion",
          message: "save schema version is not supported.",
        },
      ],
    };
  }
  return { ok: true, value: SAVE_SCHEMA_VERSION };
}

function invalidValueAtRoot(): ValidationResult<never> {
  return {
    ok: false,
    issues: [
      {
        code: "invalid-value",
        path: "",
        message: "value could not be inspected safely.",
      },
    ],
  };
}
