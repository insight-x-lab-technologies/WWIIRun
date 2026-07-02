import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import path from "node:path";
import tseslint from "typescript-eslint";

const typeScriptFiles = [
  "src/**/*.ts",
  "tests/**/*.ts",
  "scripts/**/*.ts",
  "*.config.ts",
];

const restrictedSimulationRoots = ["app", "game", "platform", "services"].map(
  (layer) => path.join(import.meta.dirname, "src", layer),
);

function isRestrictedSimulationImport(specifier, filename) {
  if (specifier === "phaser" || specifier.startsWith("phaser/")) {
    return true;
  }

  if (!specifier.startsWith(".")) {
    return false;
  }

  const resolvedImport = path.resolve(path.dirname(filename), specifier);

  return restrictedSimulationRoots.some(
    (root) =>
      resolvedImport === root ||
      resolvedImport.startsWith(`${root}${path.sep}`),
  );
}

const simulationBoundariesPlugin = {
  rules: {
    "no-external-imports": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Keep simulation independent from presentation, platform, and adapters.",
        },
        messages: {
          computedDynamicImport:
            "Simulation dynamic imports must use a static module specifier.",
          restrictedImport:
            "Simulation must remain independent from presentation, platform, and adapters.",
        },
        schema: [],
      },
      create(context) {
        function checkStaticImport(node) {
          const specifier = node.source?.value;

          if (
            typeof specifier === "string" &&
            isRestrictedSimulationImport(specifier, context.filename)
          ) {
            context.report({ node, messageId: "restrictedImport" });
          }
        }

        return {
          ExportAllDeclaration: checkStaticImport,
          ExportNamedDeclaration: checkStaticImport,
          ImportDeclaration: checkStaticImport,
          ImportExpression(node) {
            if (typeof node.source.value !== "string") {
              context.report({ node, messageId: "computedDynamicImport" });
              return;
            }

            checkStaticImport(node);
          },
        };
      },
    },
  },
};

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
    plugins: {
      "simulation-boundaries": simulationBoundariesPlugin,
    },
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
        "self",
      ],
      "simulation-boundaries/no-external-imports": "error",
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
