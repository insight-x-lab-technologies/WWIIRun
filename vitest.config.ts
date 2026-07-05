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
        "src/app/GameplaySession.ts",
        "src/app/pwaNotice.ts",
        "src/content/schema/**/*.ts",
        "src/services/save/**/*.ts",
        "src/platform/pwa/config.ts",
        "src/platform/pwa/updateCoordinator.ts",
        "src/platform/viewport/**/*.ts",
        "src/game/input.ts",
        "src/shared/validation/**/*.ts",
        "src/simulation/random/**/*.ts",
        "src/simulation/run/**/*.ts",
        "src/simulation/aircraft/**/*.ts",
        "src/simulation/collision/**/*.ts",
        "scripts/validateContent.ts",
        "scripts/inspectPwaBuild.ts",
      ],
      reportsDirectory: "coverage",
    },
  },
});
