import {
  decodeCanonicalToken,
  decodeExactObject,
  decodeJsonArray,
  decodeNormalizedRelativePath,
  type ValidationIssue,
  type ValidationResult,
} from "../../shared/validation/index.ts";

export const CONTENT_MANIFEST_SCHEMA = "wwiirun.content-manifest.v1" as const;
export const ASSET_CATALOG_SCHEMA = "wwiirun.asset-catalog.v1" as const;

export type ContentDocumentRefV1 = {
  readonly id: string;
  readonly schema: string;
  readonly path: string;
};

export type ContentManifestV1 = {
  readonly schemaVersion: typeof CONTENT_MANIFEST_SCHEMA;
  readonly manifestId: string;
  readonly contentVersion: string;
  readonly documents: readonly ContentDocumentRefV1[];
};

export type AssetRuntimeFileV1 = {
  readonly path: string;
  readonly mediaType: string;
  readonly byteLength: number;
  readonly sha256: string;
  readonly width?: number;
  readonly height?: number;
};

export type AssetLicenseV1 = {
  readonly expression: string;
  readonly evidencePath: string;
};

export type AssetProvenanceV1 = {
  readonly kind: "original" | "third-party" | "ai-assisted" | "ai-generated";
  readonly creator: string;
  readonly source: string;
  readonly tool?: string;
  readonly promptPath?: string;
};

export type AssetDescriptorV1 = {
  readonly id: string;
  readonly kind: "image" | "audio";
  readonly specPath: string;
  readonly runtimeFiles: readonly AssetRuntimeFileV1[];
  readonly license: AssetLicenseV1;
  readonly provenance: AssetProvenanceV1;
};

export type AssetCatalogV1 = {
  readonly schemaVersion: typeof ASSET_CATALOG_SCHEMA;
  readonly catalogId: string;
  readonly assets: readonly AssetDescriptorV1[];
};

export type ContentImpact = "gameplay" | "cosmetic";

export type SchemaRegistration = {
  readonly impact: ContentImpact;
  readonly decode: (value: unknown) => ValidationResult<unknown>;
};

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const AI_PROVENANCE_KINDS = new Set(["ai-assisted", "ai-generated"]);
const IMAGE_MEDIA_TYPES: Readonly<Record<string, string>> = {
  ".png": "image/png",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};
const AUDIO_MEDIA_TYPES: Readonly<Record<string, string>> = {
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".aac": "audio/aac",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
};

const schemaRegistry: Partial<Record<string, SchemaRegistration>> =
  Object.create(null) as Partial<Record<string, SchemaRegistration>>;
schemaRegistry[ASSET_CATALOG_SCHEMA] = Object.freeze({
  impact: "cosmetic" as const,
  decode: decodeAssetCatalog,
});

export const CONTENT_SCHEMA_REGISTRY: Readonly<
  Partial<Record<string, SchemaRegistration>>
> = Object.freeze(schemaRegistry);

export function getContentSchemaRegistration(
  schema: string,
): SchemaRegistration | undefined {
  return Object.hasOwn(CONTENT_SCHEMA_REGISTRY, schema)
    ? CONTENT_SCHEMA_REGISTRY[schema]
    : undefined;
}

export function decodeContentManifest(
  value: unknown,
): ValidationResult<ContentManifestV1> {
  return safelyDecode(() => decodeManifestInternal(value));
}

export function decodeAssetCatalog(
  value: unknown,
): ValidationResult<AssetCatalogV1> {
  return safelyDecode(() => decodeCatalogInternal(value));
}

export function decodeRegisteredContent(
  schema: string,
  value: unknown,
): ValidationResult<unknown> {
  const registration = getContentSchemaRegistration(schema);
  if (registration === undefined) {
    return {
      ok: false,
      issues: [
        {
          code: "unknown-schema",
          path: "/schemaVersion",
          message: "schema is not registered.",
        },
      ],
    };
  }
  return registration.decode(value);
}

function decodeManifestInternal(
  value: unknown,
): ValidationResult<ContentManifestV1> {
  const object = decodeExactObject(
    value,
    "",
    ["schemaVersion", "manifestId", "contentVersion", "documents"],
    [],
  );
  if (!object.ok) return object;

  const issues: ValidationIssue[] = [];
  const schemaVersion = decodeSchemaLiteral(
    object.value.schemaVersion,
    "/schemaVersion",
    CONTENT_MANIFEST_SCHEMA,
  );
  const manifestId = takeToken(object.value.manifestId, "/manifestId", issues);
  const contentVersion = takeToken(
    object.value.contentVersion,
    "/contentVersion",
    issues,
  );
  const documentsRaw = decodeJsonArray(object.value.documents, "/documents", {
    maxItems: 1024,
  });
  collectFailure(schemaVersion, issues);
  collectFailure(documentsRaw, issues);

  const documents: ContentDocumentRefV1[] = [];
  const ids = new Set<string>();
  const paths = new Set<string>();
  if (documentsRaw.ok) {
    for (let index = 0; index < documentsRaw.value.length; index += 1) {
      const basePath = `/documents/${index}`;
      const decoded = decodeDocumentRef(documentsRaw.value[index], basePath);
      if (!decoded.ok) {
        issues.push(...decoded.issues);
        continue;
      }
      if (ids.has(decoded.value.id)) {
        issues.push({
          code: "duplicate-id",
          path: `${basePath}/id`,
          message: "document id must be unique.",
        });
      } else {
        ids.add(decoded.value.id);
      }
      if (paths.has(decoded.value.path)) {
        issues.push({
          code: "invalid-path",
          path: `${basePath}/path`,
          message: "document path must be unique.",
        });
      } else {
        paths.add(decoded.value.path);
      }
      documents.push(decoded.value);
    }
  }

  if (
    issues.length > 0 ||
    manifestId === undefined ||
    contentVersion === undefined
  ) {
    return { ok: false, issues };
  }
  documents.sort((left, right) => asciiCompare(left.id, right.id));
  return {
    ok: true,
    value: {
      schemaVersion: CONTENT_MANIFEST_SCHEMA,
      manifestId,
      contentVersion,
      documents,
    },
  };
}

function decodeDocumentRef(
  value: unknown,
  path: string,
): ValidationResult<ContentDocumentRefV1> {
  const object = decodeExactObject(value, path, ["id", "schema", "path"], []);
  if (!object.ok) return object;
  const issues: ValidationIssue[] = [];
  const id = takeToken(object.value.id, `${path}/id`, issues);
  const schema = takeToken(object.value.schema, `${path}/schema`, issues);
  const documentPath = takePath(object.value.path, `${path}/path`, issues);
  if (
    issues.length > 0 ||
    id === undefined ||
    schema === undefined ||
    documentPath === undefined
  ) {
    return { ok: false, issues };
  }
  return { ok: true, value: { id, schema, path: documentPath } };
}

function decodeCatalogInternal(
  value: unknown,
): ValidationResult<AssetCatalogV1> {
  const object = decodeExactObject(
    value,
    "",
    ["schemaVersion", "catalogId", "assets"],
    [],
  );
  if (!object.ok) return object;
  const issues: ValidationIssue[] = [];
  const schemaVersion = decodeSchemaLiteral(
    object.value.schemaVersion,
    "/schemaVersion",
    ASSET_CATALOG_SCHEMA,
  );
  const catalogId = takeToken(object.value.catalogId, "/catalogId", issues);
  const assetsRaw = decodeJsonArray(object.value.assets, "/assets", {
    maxItems: 4096,
  });
  collectFailure(schemaVersion, issues);
  collectFailure(assetsRaw, issues);

  const assets: AssetDescriptorV1[] = [];
  const ids = new Set<string>();
  if (assetsRaw.ok) {
    for (let index = 0; index < assetsRaw.value.length; index += 1) {
      const path = `/assets/${index}`;
      const decoded = decodeAsset(assetsRaw.value[index], path);
      if (!decoded.ok) {
        issues.push(...decoded.issues);
        continue;
      }
      if (ids.has(decoded.value.id)) {
        issues.push({
          code: "duplicate-id",
          path: `${path}/id`,
          message: "asset id must be unique.",
        });
      } else {
        ids.add(decoded.value.id);
      }
      assets.push(decoded.value);
    }
  }

  if (issues.length > 0 || catalogId === undefined)
    return { ok: false, issues };
  assets.sort((left, right) => asciiCompare(left.id, right.id));
  return {
    ok: true,
    value: { schemaVersion: ASSET_CATALOG_SCHEMA, catalogId, assets },
  };
}

function decodeAsset(
  value: unknown,
  path: string,
): ValidationResult<AssetDescriptorV1> {
  const object = decodeExactObject(
    value,
    path,
    ["id", "kind", "specPath", "runtimeFiles", "license", "provenance"],
    [],
  );
  if (!object.ok) return object;
  const issues: ValidationIssue[] = [];
  const id = takeToken(object.value.id, `${path}/id`, issues);
  const kind = takeEnum(
    object.value.kind,
    `${path}/kind`,
    ["image", "audio"] as const,
    issues,
  );
  const specPath = takePath(object.value.specPath, `${path}/specPath`, issues);
  const license = decodeLicense(object.value.license, `${path}/license`);
  const provenance = decodeProvenance(
    object.value.provenance,
    `${path}/provenance`,
  );
  collectFailure(license, issues);
  collectFailure(provenance, issues);

  let runtimeFiles: readonly AssetRuntimeFileV1[] | undefined;
  if (kind !== undefined) {
    const decoded = decodeRuntimeFiles(
      object.value.runtimeFiles,
      `${path}/runtimeFiles`,
      kind,
    );
    collectFailure(decoded, issues);
    if (decoded.ok) runtimeFiles = decoded.value;
  } else {
    const decoded = decodeJsonArray(
      object.value.runtimeFiles,
      `${path}/runtimeFiles`,
      { minItems: 1, maxItems: 1024 },
    );
    collectFailure(decoded, issues);
  }

  if (
    issues.length > 0 ||
    id === undefined ||
    kind === undefined ||
    specPath === undefined ||
    runtimeFiles === undefined ||
    !license.ok ||
    !provenance.ok
  ) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    value: {
      id,
      kind,
      specPath,
      runtimeFiles,
      license: license.value,
      provenance: provenance.value,
    },
  };
}

function decodeRuntimeFiles(
  value: unknown,
  path: string,
  kind: AssetDescriptorV1["kind"],
): ValidationResult<readonly AssetRuntimeFileV1[]> {
  const array = decodeJsonArray(value, path, { minItems: 1, maxItems: 1024 });
  if (!array.ok) return array;
  const issues: ValidationIssue[] = [];
  const files: AssetRuntimeFileV1[] = [];
  for (let index = 0; index < array.value.length; index += 1) {
    const decoded = decodeRuntimeFile(
      array.value[index],
      `${path}/${index}`,
      kind,
    );
    if (decoded.ok) files.push(decoded.value);
    else issues.push(...decoded.issues);
  }
  return issues.length > 0 ? { ok: false, issues } : { ok: true, value: files };
}

function decodeRuntimeFile(
  value: unknown,
  path: string,
  kind: AssetDescriptorV1["kind"],
): ValidationResult<AssetRuntimeFileV1> {
  const required = ["path", "mediaType", "byteLength", "sha256"];
  if (kind === "image") required.push("width", "height");
  const object = decodeExactObject(value, path, required, []);
  if (!object.ok) return object;
  const issues: ValidationIssue[] = [];
  const runtimePath = takePath(object.value.path, `${path}/path`, issues);
  const mediaType = takeNonBlankString(
    object.value.mediaType,
    `${path}/mediaType`,
    256,
    issues,
  );
  const byteLength = takeInteger(
    object.value.byteLength,
    `${path}/byteLength`,
    0,
    issues,
  );
  const sha256 = takePatternString(
    object.value.sha256,
    `${path}/sha256`,
    SHA256_PATTERN,
    "must be 64 lowercase hexadecimal characters.",
    issues,
  );
  const width =
    kind === "image"
      ? takeInteger(object.value.width, `${path}/width`, 1, issues)
      : undefined;
  const height =
    kind === "image"
      ? takeInteger(object.value.height, `${path}/height`, 1, issues)
      : undefined;
  if (runtimePath !== undefined && mediaType !== undefined) {
    const expected = expectedMediaType(runtimePath, kind);
    if (expected === undefined || expected !== mediaType) {
      issues.push({
        code: "invalid-value",
        path: `${path}/mediaType`,
        message: `must match the ${kind} file extension.`,
      });
    }
  }
  if (
    issues.length > 0 ||
    runtimePath === undefined ||
    mediaType === undefined ||
    byteLength === undefined ||
    sha256 === undefined
  ) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    value: {
      path: runtimePath,
      mediaType,
      byteLength,
      sha256,
      ...(width === undefined ? {} : { width }),
      ...(height === undefined ? {} : { height }),
    },
  };
}

function decodeLicense(
  value: unknown,
  path: string,
): ValidationResult<AssetLicenseV1> {
  const object = decodeExactObject(
    value,
    path,
    ["expression", "evidencePath"],
    [],
  );
  if (!object.ok) return object;
  const issues: ValidationIssue[] = [];
  const expression = takeNonBlankString(
    object.value.expression,
    `${path}/expression`,
    256,
    issues,
  );
  const evidencePath = takePath(
    object.value.evidencePath,
    `${path}/evidencePath`,
    issues,
  );
  if (
    issues.length > 0 ||
    expression === undefined ||
    evidencePath === undefined
  ) {
    return { ok: false, issues };
  }
  return { ok: true, value: { expression, evidencePath } };
}

function decodeProvenance(
  value: unknown,
  path: string,
): ValidationResult<AssetProvenanceV1> {
  const shape = decodeExactObject(
    value,
    path,
    ["kind", "creator", "source"],
    ["tool", "promptPath"],
  );
  if (!shape.ok) return shape;
  const initialIssues: ValidationIssue[] = [];
  const kind = takeEnum(
    shape.value.kind,
    `${path}/kind`,
    ["original", "third-party", "ai-assisted", "ai-generated"] as const,
    initialIssues,
  );
  if (kind === undefined) return { ok: false, issues: initialIssues };

  const isAi = AI_PROVENANCE_KINDS.has(kind);
  const exact = decodeExactObject(
    value,
    path,
    isAi
      ? ["kind", "creator", "source", "tool", "promptPath"]
      : ["kind", "creator", "source"],
    [],
  );
  if (!exact.ok) return exact;
  const issues: ValidationIssue[] = [];
  const creator = takeNonBlankString(
    exact.value.creator,
    `${path}/creator`,
    256,
    issues,
  );
  const source = takeNonBlankString(
    exact.value.source,
    `${path}/source`,
    1024,
    issues,
  );
  const tool = isAi
    ? takeNonBlankString(exact.value.tool, `${path}/tool`, 256, issues)
    : undefined;
  const promptPath = isAi
    ? takePath(exact.value.promptPath, `${path}/promptPath`, issues)
    : undefined;
  if (
    issues.length > 0 ||
    creator === undefined ||
    source === undefined ||
    (isAi && (tool === undefined || promptPath === undefined))
  ) {
    return { ok: false, issues };
  }
  return {
    ok: true,
    value: {
      kind,
      creator,
      source,
      ...(tool === undefined ? {} : { tool }),
      ...(promptPath === undefined ? {} : { promptPath }),
    },
  };
}

function decodeSchemaLiteral<T extends string>(
  value: unknown,
  path: string,
  expected: T,
): ValidationResult<T> {
  if (typeof value !== "string") {
    return issueResult("invalid-type", path, "must be a string.");
  }
  if (value !== expected) {
    return issueResult("unsupported-version", path, `must be ${expected}.`);
  }
  return { ok: true, value: expected };
}

function takeToken(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): string | undefined {
  const result = decodeCanonicalToken(value, path);
  return takeResult(result, issues);
}

function takePath(
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): string | undefined {
  const result = decodeNormalizedRelativePath(value, path);
  return takeResult(result, issues);
}

function takeNonBlankString(
  value: unknown,
  path: string,
  maxLength: number,
  issues: ValidationIssue[],
): string | undefined {
  if (typeof value !== "string") {
    issues.push({ code: "invalid-type", path, message: "must be a string." });
    return undefined;
  }
  if (value.trim().length === 0 || value.length > maxLength) {
    issues.push({
      code: "invalid-value",
      path,
      message: `must contain non-whitespace text of at most ${maxLength} characters.`,
    });
    return undefined;
  }
  return value;
}

function takePatternString(
  value: unknown,
  path: string,
  pattern: RegExp,
  message: string,
  issues: ValidationIssue[],
): string | undefined {
  if (typeof value !== "string") {
    issues.push({ code: "invalid-type", path, message: "must be a string." });
    return undefined;
  }
  if (!pattern.test(value)) {
    issues.push({ code: "invalid-value", path, message });
    return undefined;
  }
  return value;
}

function takeInteger(
  value: unknown,
  path: string,
  minimum: number,
  issues: ValidationIssue[],
): number | undefined {
  if (typeof value !== "number") {
    issues.push({ code: "invalid-type", path, message: "must be a number." });
    return undefined;
  }
  if (!Number.isSafeInteger(value) || value < minimum) {
    issues.push({
      code: "invalid-value",
      path,
      message: `must be a safe integer greater than or equal to ${minimum}.`,
    });
    return undefined;
  }
  return value;
}

function takeEnum<const T extends readonly string[]>(
  value: unknown,
  path: string,
  allowed: T,
  issues: ValidationIssue[],
): T[number] | undefined {
  if (typeof value !== "string") {
    issues.push({ code: "invalid-type", path, message: "must be a string." });
    return undefined;
  }
  if (!allowed.includes(value)) {
    issues.push({
      code: "invalid-value",
      path,
      message: `must be one of: ${allowed.join(", ")}.`,
    });
    return undefined;
  }
  return value;
}

function expectedMediaType(
  path: string,
  kind: AssetDescriptorV1["kind"],
): string | undefined {
  const slashIndex = path.lastIndexOf("/");
  const fileName = path.slice(slashIndex + 1);
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex < 0 ? "" : fileName.slice(dotIndex);
  return kind === "image"
    ? IMAGE_MEDIA_TYPES[extension]
    : AUDIO_MEDIA_TYPES[extension];
}

function collectFailure<T>(
  result: ValidationResult<T>,
  issues: ValidationIssue[],
): void {
  if (!result.ok) issues.push(...result.issues);
}

function takeResult<T>(
  result: ValidationResult<T>,
  issues: ValidationIssue[],
): T | undefined {
  if (!result.ok) {
    issues.push(...result.issues);
    return undefined;
  }
  return result.value;
}

function issueResult(
  code: ValidationIssue["code"],
  path: string,
  message: string,
): ValidationResult<never> {
  return { ok: false, issues: [{ code, path, message }] };
}

function asciiCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function safelyDecode<T>(
  decode: () => ValidationResult<T>,
): ValidationResult<T> {
  try {
    return decode();
  } catch {
    return issueResult(
      "invalid-value",
      "",
      "value could not be inspected safely.",
    );
  }
}
