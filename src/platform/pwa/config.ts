export type PublicBasePath = "/" | `/${string}/`;

export type PwaManifestIcon = {
  readonly src: string;
  readonly sizes: "192x192" | "512x512";
  readonly type: "image/png";
  readonly purpose: "any" | "maskable";
};

export type PwaBuildConfig = {
  readonly basePath: PublicBasePath;
  readonly buildId: string;
  readonly manifest: {
    readonly id: PublicBasePath;
    readonly start_url: PublicBasePath;
    readonly scope: PublicBasePath;
    readonly icons: readonly PwaManifestIcon[];
  };
  readonly manifestUrl: string;
  readonly serviceWorkerUrl: string;
};

const BASE_SEGMENT_PATTERN = /^[A-Za-z0-9_~-]+(?:\.[A-Za-z0-9_~-]+)*$/u;
const BUILD_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/u;

export function parsePublicBasePath(value: string | undefined): PublicBasePath {
  const candidate = value ?? "/";
  const invalid = (): never => {
    throw new Error(
      "WWIIRUN_BASE_PATH must be '/' or a canonical absolute path with safe segments and leading/trailing slashes.",
    );
  };

  if (
    candidate === "" ||
    !candidate.startsWith("/") ||
    !candidate.endsWith("/") ||
    candidate.includes("//") ||
    /[\\?#]/u.test(candidate)
  ) {
    return invalid();
  }
  if (candidate === "/") return candidate;

  const segments = candidate.slice(1, -1).split("/");
  if (
    segments.some(
      (segment) =>
        segment === "" ||
        segment === "." ||
        segment === ".." ||
        !BASE_SEGMENT_PATTERN.test(segment),
    )
  ) {
    return invalid();
  }
  return candidate as PublicBasePath;
}

export function createPwaBuildConfig(options: {
  readonly basePath: string | undefined;
  readonly buildId: string | undefined;
}): PwaBuildConfig {
  const basePath = parsePublicBasePath(options.basePath);
  const buildId = options.buildId ?? "local";
  if (!BUILD_ID_PATTERN.test(buildId)) {
    throw new Error(
      "WWIIRUN_BUILD_ID must be a 1-64 character ASCII token using letters, digits, dot, underscore, or hyphen.",
    );
  }

  const icons: readonly PwaManifestIcon[] = [
    {
      src: `${basePath}assets/core/pwa/pwa-192x192.png`,
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: `${basePath}assets/core/pwa/pwa-512x512.png`,
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: `${basePath}assets/core/pwa/pwa-maskable-512x512.png`,
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
  ];
  return {
    basePath,
    buildId,
    manifest: { id: basePath, start_url: basePath, scope: basePath, icons },
    manifestUrl: `${basePath}manifest.webmanifest`,
    serviceWorkerUrl: `${basePath}sw.js`,
  };
}
