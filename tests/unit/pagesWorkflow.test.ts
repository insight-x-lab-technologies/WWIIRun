import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

describe("manual Pages workflow", () => {
  const workflow = readFileSync(".github/workflows/pages-preview.yml", "utf8");

  it("has only a manual trigger and no secrets or branch publication", () => {
    expect(workflow).toMatch(/^on:\n  workflow_dispatch:\s*$/mu);
    expect(workflow).not.toMatch(/\b(?:push|pull_request|schedule):/u);
    expect(workflow).not.toContain("secrets.");
    expect(workflow).not.toMatch(
      /publish_branch|peaceiris\/actions-gh-pages|git push/u,
    );
  });

  it("pins official actions and grants deploy rights only to deploy", () => {
    for (const use of workflow.matchAll(/uses: ([^\s#]+)/gu)) {
      expect(use[1]).toMatch(/^actions\/[a-z-]+@[0-9a-f]{40}$/u);
    }
    const buildJob = workflow.slice(
      workflow.indexOf("  build:"),
      workflow.indexOf("  deploy:"),
    );
    expect(buildJob).toContain("contents: read");
    expect(buildJob).not.toContain("pages: write");
    expect(buildJob).not.toContain("id-token: write");
    const deployJob = workflow.slice(workflow.indexOf("  deploy:"));
    expect(deployJob).toContain("pages: write");
    expect(deployJob).toContain("id-token: write");
  });

  it("runs gates, builds the approved subpath, and uploads only dist", () => {
    expect(workflow).toContain("run: npm run check");
    expect(workflow).toContain("run: npm run test:e2e");
    expect(workflow).toContain("run: npm run test:pwa");
    expect(workflow).toContain("WWIIRUN_BASE_PATH: /WWIIRun/");
    expect(workflow).toContain("WWIIRUN_BUILD_ID: ${{ github.sha }}");
    expect(workflow).toMatch(/with:\n\s+path: dist/u);
  });
});
