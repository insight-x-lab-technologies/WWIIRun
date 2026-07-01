import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const typeScriptFiles = [
  "src/**/*.ts",
  "tests/**/*.ts",
  "scripts/**/*.ts",
  "*.config.ts",
];

export default defineConfig(
  globalIgnores([
    "node_modules/",
    "dist/",
    "build/",
    "coverage/",
    "playwright-report/",
    "test-results/",
    ".vite/",
    ".vitest/",
    ".playwright/",
  ]),
  {
    ...js.configs.recommended,
    files: ["eslint.config.mjs"],
  },
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: typeScriptFiles,
  })),
  {
    files: typeScriptFiles,
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    rules: {
      "no-console": "warn",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-check": false,
          "ts-expect-error": "allow-with-description",
          "ts-ignore": true,
          "ts-nocheck": true,
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
  {
    files: ["src/simulation/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        "document",
        "window",
        "navigator",
        "location",
        "fetch",
        "XMLHttpRequest",
        "WebSocket",
        "localStorage",
        "sessionStorage",
        "indexedDB",
        "Intl",
        "performance",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "globalThis",
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["phaser", "phaser/*"],
              message:
                "simulation must remain independent from presentation, platform, and adapters",
            },
            {
              regex: "^(?:\\.\\./)+(?:app|game|platform|services)(?:/|$)",
              message:
                "simulation must remain independent from presentation, platform, and adapters",
            },
          ],
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message: "Use a simulation-owned seeded PRNG.",
        },
        {
          object: "Date",
          property: "now",
          message: "Use simulation ticks instead of wall-clock time.",
        },
      ],
    },
  },
);
