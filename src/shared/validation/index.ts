export type ValidationIssueCode =
  | "invalid-type"
  | "invalid-value"
  | "missing-key"
  | "unknown-key"
  | "duplicate-id"
  | "unsupported-version"
  | "unknown-schema"
  | "invalid-path"
  | "missing-reference"
  | "integrity-mismatch";

export type ValidationIssue = {
  readonly code: ValidationIssueCode;
  readonly path: string;
  readonly message: string;
};

export type ValidationResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

const TOKEN_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,63}$/;
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

export function appendJsonPointer(path: string, segment: string): string {
  const escaped = segment.replaceAll("~", "~0").replaceAll("/", "~1");
  return `${path}/${escaped}`;
}

export function decodeCanonicalToken(
  value: unknown,
  path: string,
): ValidationResult<string> {
  if (typeof value !== "string") {
    return failure("invalid-type", path, "must be a string.");
  }
  if (!TOKEN_PATTERN.test(value)) {
    return failure(
      "invalid-value",
      path,
      "must be a canonical ASCII token of 1 to 64 characters.",
    );
  }
  return { ok: true, value };
}

export function decodeNormalizedRelativePath(
  value: unknown,
  path: string,
): ValidationResult<string> {
  if (typeof value !== "string") {
    return failure("invalid-type", path, "must be a string.");
  }

  const segments = value.split("/");
  const invalid =
    value.length === 0 ||
    value.length > 256 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#") ||
    URL_SCHEME_PATTERN.test(value) ||
    segments.some(
      (segment) => segment.length === 0 || segment === "." || segment === "..",
    );
  if (invalid) {
    return failure(
      "invalid-path",
      path,
      "must be a normalized relative path of at most 256 characters.",
    );
  }
  return { ok: true, value };
}

export function decodeExactObject(
  value: unknown,
  path: string,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[],
): ValidationResult<Readonly<Record<string, unknown>>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return failure("invalid-type", path, "must be a plain JSON object.");
  }

  try {
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      return failure("invalid-type", path, "must be a plain JSON object.");
    }

    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key === "symbol")) {
      return failure("invalid-value", path, "must not contain symbol keys.");
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const issues: ValidationIssue[] = [];
    const allowed = new Set([...requiredKeys, ...optionalKeys]);
    const stringKeys = ownKeys as string[];

    for (const key of requiredKeys) {
      if (!(key in descriptors)) {
        issues.push({
          code: "missing-key",
          path: appendJsonPointer(path, key),
          message: "required key is missing.",
        });
      }
    }

    for (const key of [...stringKeys].sort()) {
      const descriptor = descriptors[key];
      if (descriptor === undefined) continue;
      if (!("value" in descriptor) || descriptor.enumerable !== true) {
        issues.push({
          code: "invalid-value",
          path: appendJsonPointer(path, key),
          message: "must be an enumerable data property.",
        });
      }
      if (!allowed.has(key)) {
        issues.push({
          code: "unknown-key",
          path: appendJsonPointer(path, key),
          message: "key is not allowed.",
        });
      }
    }

    if (issues.length > 0) return { ok: false, issues };

    const copied: Record<string, unknown> = {};
    for (const key of [...requiredKeys, ...optionalKeys]) {
      const descriptor = descriptors[key];
      if (descriptor !== undefined && "value" in descriptor) {
        copied[key] = descriptor.value;
      }
    }
    return { ok: true, value: copied };
  } catch {
    return failure(
      "invalid-value",
      path,
      "object properties could not be inspected safely.",
    );
  }
}

export function decodeJsonArray(
  value: unknown,
  path: string,
  options: { readonly minItems?: number; readonly maxItems: number },
): ValidationResult<readonly unknown[]> {
  if (!Array.isArray(value)) {
    return failure("invalid-type", path, "must be a JSON array.");
  }

  try {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      return failure("invalid-type", path, "must be a JSON array.");
    }
    if (
      value.length < (options.minItems ?? 0) ||
      value.length > options.maxItems
    ) {
      return failure(
        "invalid-value",
        path,
        `must contain between ${options.minItems ?? 0} and ${options.maxItems} items.`,
      );
    }

    const descriptors = Object.getOwnPropertyDescriptors(value);
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key === "symbol")) {
      return failure("invalid-value", path, "must not contain symbol keys.");
    }

    const copied: unknown[] = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = descriptors[index.toString()];
      if (
        descriptor === undefined ||
        !("value" in descriptor) ||
        descriptor.enumerable !== true
      ) {
        return failure(
          "invalid-value",
          appendJsonPointer(path, index.toString()),
          "array items must be dense data properties.",
        );
      }
      copied.push(descriptor.value);
    }

    const extraKey = ownKeys.find(
      (key) =>
        typeof key === "string" &&
        key !== "length" &&
        !/^(0|[1-9][0-9]*)$/.test(key),
    );
    if (typeof extraKey === "string") {
      return failure(
        "unknown-key",
        appendJsonPointer(path, extraKey),
        "key is not allowed on a JSON array.",
      );
    }
    return { ok: true, value: copied };
  } catch {
    return failure(
      "invalid-value",
      path,
      "array items could not be inspected safely.",
    );
  }
}

function failure(
  code: ValidationIssueCode,
  path: string,
  message: string,
): ValidationResult<never> {
  return { ok: false, issues: [{ code, path, message }] };
}
