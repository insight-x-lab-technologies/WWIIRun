import { Linter } from "eslint";
import { describe, expect, it } from "vitest";

// @ts-expect-error -- the executable ESLint MJS config has no TS declaration.
const eslintConfigModule: unknown = await import("../../eslint.config.mjs");
const eslintConfig = (
  eslintConfigModule as { default: readonly Linter.Config[] }
).default;

const configuredSimulationRules = eslintConfig.at(-1)?.rules;
const configuredSimulationPlugins = eslintConfig.at(-1)?.plugins;

if (
  configuredSimulationRules === undefined ||
  configuredSimulationPlugins === undefined
) {
  throw new Error(
    "The ESLint simulation override must define rules and plugins.",
  );
}

const simulationRules: NonNullable<Linter.Config["rules"]> =
  configuredSimulationRules;
const simulationPlugins: NonNullable<Linter.Config["plugins"]> =
  configuredSimulationPlugins;

function lintSimulation(code: string): Linter.LintMessage[] {
  const linter = new Linter();

  return linter.verify(
    code,
    [
      {
        files: ["**/*.ts"],
        plugins: simulationPlugins,
        languageOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
        },
        rules: simulationRules,
      },
    ],
    {
      filename: "src/simulation/random/internal/sample.ts",
    },
  );
}

describe("ESLint simulation boundaries", () => {
  const restrictedRootRelativeImports = [
    "app",
    "game",
    "platform",
    "services",
  ] as const;

  const rootRelativeImportForms = [
    {
      name: "static imports",
      code: (layer: string) =>
        `import value from "/src/${layer}/module"; void value;`,
    },
    {
      name: "named reexports",
      code: (layer: string) => `export { value } from "/src/${layer}/module";`,
    },
    {
      name: "export-all declarations",
      code: (layer: string) => `export * from "/src/${layer}/module";`,
    },
    {
      name: "dynamic imports",
      code: (layer: string) => `void import("/src/${layer}/module");`,
    },
  ] as const;

  it("rejects entropy accessed through globalThis", () => {
    const messages = lintSimulation("globalThis.Math.random();");

    expect(messages.map(({ ruleId }) => ruleId)).toContain(
      "no-restricted-globals",
    );
  });

  it("rejects architecture imports through any parent depth", () => {
    const messages = lintSimulation(
      'import createGame from "../../../game/createGame";',
    );

    expect(messages.map(({ ruleId }) => ruleId)).toContain(
      "no-restricted-imports",
    );
  });

  it("rejects architecture imports with a current-directory prefix", () => {
    const messages = lintSimulation(
      'import createGame from "./../../../game/createGame";',
    );

    expect(messages.map(({ ruleId }) => ruleId)).toContain(
      "simulation-boundaries/no-external-imports",
    );
  });

  it("rejects normalized architecture import paths", () => {
    const messages = lintSimulation(
      'import createGame from "../../../simulation/../game/createGame";',
    );

    expect(messages.map(({ ruleId }) => ruleId)).toContain(
      "simulation-boundaries/no-external-imports",
    );
  });

  it("rejects dynamic architecture imports", () => {
    const messages = lintSimulation(
      'void import("../../../services/scoreService");',
    );

    expect(messages.map(({ ruleId }) => ruleId)).toContain(
      "simulation-boundaries/no-external-imports",
    );
  });

  it("rejects computed dynamic imports that cannot be resolved statically", () => {
    const messages = lintSimulation("void import(targetModule);");

    expect(messages.map(({ ruleId }) => ruleId)).toContain(
      "simulation-boundaries/no-external-imports",
    );
  });

  it("rejects browser and entropy access through self", () => {
    const messages = lintSimulation("self.Math.random(); self.fetch('/seed');");

    expect(messages.map(({ ruleId }) => ruleId)).toContain(
      "no-restricted-globals",
    );
  });

  for (const layer of restrictedRootRelativeImports) {
    for (const importForm of rootRelativeImportForms) {
      it(`rejects ${importForm.name} into root-relative ${layer}`, () => {
        const messages = lintSimulation(importForm.code(layer));

        expect(messages.map(({ ruleId }) => ruleId)).toContain(
          "simulation-boundaries/no-external-imports",
        );
      });
    }
  }

  it("rejects normalized root-relative architecture import paths", () => {
    const messages = lintSimulation(
      'void import("/src/simulation/../services/scoreService");',
    );

    expect(messages.map(({ ruleId }) => ruleId)).toContain(
      "simulation-boundaries/no-external-imports",
    );
  });

  it("rejects URL-normalized root-relative architecture imports", () => {
    const messages = lintSimulation(
      'import value from "/src/%67ame/createGame?raw#module"; void value;',
    );

    expect(messages.map(({ ruleId }) => ruleId)).toContain(
      "simulation-boundaries/no-external-imports",
    );
  });

  for (const layer of restrictedRootRelativeImports) {
    it(`rejects the root-relative ${layer} layer root with a Vite query`, () => {
      const messages = lintSimulation(`void import("/src/${layer}?raw");`);

      expect(messages.map(({ ruleId }) => ruleId)).toContain(
        "simulation-boundaries/no-external-imports",
      );
    });
  }

  it("rejects root-relative architecture imports with URL separators", () => {
    const messages = lintSimulation(
      'import value from "/src\\\\services\\\\scoreService"; void value;',
    );

    expect(messages.map(({ ruleId }) => ruleId)).toContain(
      "simulation-boundaries/no-external-imports",
    );
  });

  it("allows root-relative imports within pure layers", () => {
    const messages = lintSimulation(
      'import state from "/src/simulation/state?raw"; import value from "/src/shared/value"; void state; void value;',
    );

    expect(messages).toEqual([]);
  });

  it("allows deep relative imports outside restricted layers", () => {
    const messages = lintSimulation(
      'import value from "../../../shared/value";',
    );

    expect(messages).toEqual([]);
  });
});
