import { describe, expect, it } from "vitest";

import performancePlaywrightConfig from "../performance/playwright.config";
import performanceViteConfig from "../performance/vite.config";

describe("performance harness server contract", () => {
  it("is reachable from the local network on the required port", () => {
    expect(performanceViteConfig).toMatchObject({
      server: {
        host: "0.0.0.0",
        port: 8080,
        strictPort: true,
      },
    });
  });

  it("keeps automated smoke tests on the internal port", () => {
    expect(performancePlaywrightConfig.use?.baseURL).toBe(
      "http://127.0.0.1:8081",
    );
    expect(performancePlaywrightConfig.webServer).toMatchObject({
      command: "npm run performance:harness -- --host 127.0.0.1 --port 8081",
      url: "http://127.0.0.1:8081",
    });
  });
});
