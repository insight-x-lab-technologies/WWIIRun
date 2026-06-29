import { describe, expect, it } from "vitest";

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
});
