import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const fixtureRoot = resolve(tmpdir(), "wwiirun-pwa-fixtures");
const basePath = "/WWIIRun/";
let activeVersion: "a" | "b" = "a";

await buildFixture("a");
await buildFixture("b");

const server = createServer((request, response) => {
  void handleRequest(request, response);
});

async function handleRequest(
  request: import("node:http").IncomingMessage,
  response: import("node:http").ServerResponse,
): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1:4174");
    if (url.pathname === "/__test__/health") {
      response.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
      response.end("ok");
      return;
    }
    if (url.pathname.startsWith("/__test__/version/")) {
      const version = url.pathname.at(-1);
      if (request.method !== "POST" || (version !== "a" && version !== "b")) {
        respondNotFound(response);
        return;
      }
      activeVersion = version;
      response.writeHead(204, { "cache-control": "no-store" });
      response.end();
      return;
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      respondNotFound(response);
      return;
    }
    if (!url.pathname.startsWith(basePath)) {
      respondNotFound(response);
      return;
    }

    const relativePath = decodeURIComponent(
      url.pathname.slice(basePath.length),
    );
    const filePath = resolve(
      fixtureRoot,
      activeVersion,
      relativePath === "" ? "index.html" : relativePath,
    );
    const versionRoot = resolve(fixtureRoot, activeVersion);
    if (!isInside(versionRoot, filePath) || !(await isFile(filePath))) {
      respondNotFound(response);
      return;
    }

    const body = await readFile(filePath);
    const headers: Record<string, string> = {
      "content-type": contentType(filePath),
      "content-length": String(body.byteLength),
      "cache-control": cacheControl(filePath),
    };
    response.writeHead(200, headers);
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    response.end("fixture server failure");
  }
}

server.listen(4174, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close(() => process.exit(0)));
}

async function buildFixture(version: "a" | "b"): Promise<void> {
  const viteCli = resolve(repositoryRoot, "node_modules/vite/bin/vite.js");
  const outDir = resolve(fixtureRoot, version);
  await new Promise<void>((resolveBuild, rejectBuild) => {
    const child = spawn(
      process.execPath,
      [
        viteCli,
        "build",
        "--mode",
        "pwa-test",
        "--outDir",
        outDir,
        "--emptyOutDir",
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          WWIIRUN_BASE_PATH: basePath,
          WWIIRUN_BUILD_ID: `pwa-e2e-${version}`,
        },
        stdio: "inherit",
      },
    );
    child.once("error", rejectBuild);
    child.once("exit", (code) => {
      if (code === 0) resolveBuild();
      else
        rejectBuild(new Error(`PWA fixture ${version} build failed: ${code}`));
    });
  });
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function isInside(root: string, candidate: string): boolean {
  return candidate === root || candidate.startsWith(`${root}${sep}`);
}

function respondNotFound(response: import("node:http").ServerResponse): void {
  response.writeHead(404, {
    "content-type": "text/plain; charset=utf-8",
    "cache-control": "no-store",
  });
  response.end("not found");
}

function contentType(path: string): string {
  const extension = extname(path).toLowerCase();
  return (
    {
      ".css": "text/css; charset=utf-8",
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".webmanifest": "application/manifest+json; charset=utf-8",
    }[extension] ?? "application/octet-stream"
  );
}

function cacheControl(path: string): string {
  const name = path.split(sep).at(-1) ?? "";
  if (
    name === "sw.js" ||
    name === "index.html" ||
    name.endsWith(".webmanifest")
  ) {
    return "no-cache";
  }
  return name.includes("-")
    ? "public, max-age=31536000, immutable"
    : "no-cache";
}
