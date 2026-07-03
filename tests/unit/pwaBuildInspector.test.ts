import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { inspectPwaBuild } from "../../scripts/inspectPwaBuild";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("PWA build inspector", () => {
  it("accepts a coherent subpath artifact", async () => {
    const dist = await fixture();
    expect(
      inspectPwaBuild({ distDirectory: dist, basePath: "/WWIIRun/" }),
    ).toEqual([]);
  });

  it("rejects root leaks, manifest drift, missing icons, and runtime caching", async () => {
    const dist = await fixture();
    await writeFile(
      join(dist, "index.html"),
      '<script src="/assets/root-leak.js"></script>',
    );
    await writeFile(
      join(dist, "manifest.webmanifest"),
      JSON.stringify({ id: "/", start_url: "/", scope: "/", icons: [] }),
    );
    await writeFile(
      join(dist, "sw.js"),
      'precacheAndRoute([{url:"icon.png",revision:null},{url:"icon.png",revision:"abc"}]); registerRoute(/api/, new NetworkFirst());',
    );

    expect(
      inspectPwaBuild({ distDirectory: dist, basePath: "/WWIIRun/" }),
    ).toEqual([
      "index.html contains a root-relative reference outside /WWIIRun/: /assets/root-leak.js",
      "manifest id must equal /WWIIRun/.",
      "manifest start_url must equal /WWIIRun/.",
      "manifest scope must equal /WWIIRun/.",
      "manifest must declare PNG icons for 192x192, 512x512, and maskable 512x512.",
      "service worker precache contains duplicate URL: icon.png.",
      "service worker must not configure runtime cache strategies.",
    ]);
  });
});

async function fixture(): Promise<string> {
  const dist = await mkdtemp(join(tmpdir(), "wwiirun-pwa-inspect-"));
  directories.push(dist);
  await mkdir(join(dist, "assets", "core", "pwa"), { recursive: true });
  await writeFile(
    join(dist, "index.html"),
    '<link rel="manifest" href="/WWIIRun/manifest.webmanifest"><script src="/WWIIRun/assets/app.js"></script>',
  );
  await writeFile(
    join(dist, "manifest.webmanifest"),
    JSON.stringify({
      id: "/WWIIRun/",
      start_url: "/WWIIRun/",
      scope: "/WWIIRun/",
      icons: [
        {
          src: "/WWIIRun/assets/core/pwa/192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/WWIIRun/assets/core/pwa/512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/WWIIRun/assets/core/pwa/maskable.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    }),
  );
  await writeFile(
    join(dist, "sw.js"),
    'precacheAndRoute([{url:"index.html",revision:"1"}]); registerRoute(new NavigationRoute(handler));',
  );
  await Promise.all(
    ["192.png", "512.png", "maskable.png"].map((name) =>
      writeFile(join(dist, "assets", "core", "pwa", name), "png"),
    ),
  );
  return dist;
}
