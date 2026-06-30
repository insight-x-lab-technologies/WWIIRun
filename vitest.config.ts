import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: [["text", { skipFull: false }], "html"],
      include: [
        "src/app/bootstrapApplication.ts",
        "src/content/schema/**/*.ts",
        "src/services/save/**/*.ts",
        "src/shared/validation/**/*.ts",
        "src/simulation/random/**/*.ts",
        "src/simulation/run/**/*.ts",
        "scripts/validateContent.ts",
      ],
      reportsDirectory: "coverage",
    },
  },
});
