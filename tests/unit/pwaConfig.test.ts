import { describe, expect, it } from "vitest";

import {
  createPwaBuildConfig,
  parsePublicBasePath,
} from "../../src/platform/pwa/config";

describe("PWA build configuration", () => {
  it.each([
    [undefined, "/"],
    ["/", "/"],
    ["/WWIIRun/", "/WWIIRun/"],
    ["/preview-1/app_v2/", "/preview-1/app_v2/"],
  ])("accepts canonical public base %s", (input, expected) => {
    expect(parsePublicBasePath(input)).toBe(expected);
  });

  it.each([
    "WWIIRun/",
    "/WWIIRun",
    "//WWIIRun/",
    "/WWIIRun//preview/",
    "/./",
    "/../",
    "/WWIIRun/../preview/",
    "/WWIIRun\\preview/",
    "/WWIIRun/?mode=test",
    "/WWIIRun/#test",
    "https://example.com/WWIIRun/",
  ])("rejects non-canonical public base %s", (input) => {
    expect(() => parsePublicBasePath(input)).toThrow("WWIIRUN_BASE_PATH");
  });

  it("derives manifest, worker, icon, and build metadata from one base", () => {
    expect(
      createPwaBuildConfig({
        basePath: "/WWIIRun/",
        buildId: "commit-abc123",
      }),
    ).toEqual({
      basePath: "/WWIIRun/",
      buildId: "commit-abc123",
      manifest: {
        id: "/WWIIRun/",
        start_url: "/WWIIRun/",
        scope: "/WWIIRun/",
        icons: [
          {
            src: "/WWIIRun/assets/core/pwa/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/WWIIRun/assets/core/pwa/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "/WWIIRun/assets/core/pwa/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      manifestUrl: "/WWIIRun/manifest.webmanifest",
      serviceWorkerUrl: "/WWIIRun/sw.js",
    });
  });

  it.each(["", "space id", "a/b", "x".repeat(65)])(
    "rejects invalid build id %s",
    (buildId) => {
      expect(() => createPwaBuildConfig({ basePath: "/", buildId })).toThrow(
        "WWIIRUN_BUILD_ID",
      );
    },
  );
});
