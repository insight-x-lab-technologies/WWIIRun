import { Linter } from "eslint";
import { describe, expect, it } from "vitest";

// @ts-expect-error -- the executable ESLint MJS config has no TS declaration.
const eslintConfigModule: unknown = await import("../../eslint.config.mjs");
const eslintConfig = (
  eslintConfigModule as { default: readonly Linter.Config[] }
).default;

const configuredSimulationRules = eslintConfig.at(-1)?.rules;

if (configuredSimulationRules === undefined) {
  throw new Error("The ESLint simulation override must define rules.");
}

const simulationRules: NonNullable<Linter.Config["rules"]> =
  configuredSimulationRules;

function lintSimulation(code: string): Linter.LintMessage[] {
  const linter = new Linter();

  return linter.verify(code, [
    {
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      rules: simulationRules,
    },
  ]);
}

describe("ESLint simulation boundaries", () => {
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

  it("allows deep relative imports outside restricted layers", () => {
    const messages = lintSimulation(
      'import value from "../../../shared/value";',
    );

    expect(messages).toEqual([]);
  });
});
