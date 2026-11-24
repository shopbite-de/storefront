/**
 * Reporter of the mutants run (`pnpm test:bdd:mutants`): `@fail` makes a
 * mutant pass however it fails, so this checks that each one ran every
 * step before its last one and failed exactly there. A mutant that fails
 * earlier (a broken prefix, a timeout in a Given) or not at all makes the
 * run fail.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type {
  FullResult,
  Reporter,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";

const FEATURE = fileURLToPath(new URL("./mutants.feature", import.meta.url));
const STEP = /^\s*(Given|When|Then|And|But)\s/;

/** Scenario name → its steps (no Background in the mutants). */
export function stepsOf(feature: string): Map<string, string[]> {
  const scenarios = new Map<string, string[]>();
  let current: string[] | undefined;
  for (const line of feature.split("\n")) {
    const scenario = /^\s*Scenario:\s*(.+?)\s*$/.exec(line);
    if (scenario) scenarios.set(scenario[1]!, (current = []));
    else if (current && STEP.test(line)) current.push(line.trim());
  }
  return scenarios;
}

export default class LastStepReporter implements Reporter {
  private readonly scenarios = stepsOf(readFileSync(FEATURE, "utf8"));
  private readonly wrong: string[] = [];
  private checked = 0;

  onTestEnd(test: TestCase, result: TestResult) {
    const expected = this.scenarios.get(test.title);
    if (!expected) return;
    this.checked++;
    const ran = result.steps.filter(
      (step: TestStep) => step.category === "test.step",
    );
    const failed = ran.findIndex((step) => step.error);
    const last = expected.length - 1;
    if (
      result.status !== "failed" ||
      failed !== last ||
      ran.length !== expected.length
    ) {
      this.wrong.push(
        `${test.title}: ${result.status}, ran ${ran.length} of ${expected.length} steps, ` +
          (failed < 0
            ? "none failed"
            : `failed at step ${failed + 1} "${ran[failed]!.title}"`) +
          `; must fail at step ${last + 1} "${expected[last]}"`,
      );
    }
  }

  async onEnd(): Promise<{ status?: FullResult["status"] } | undefined> {
    if (this.wrong.length) {
      console.error(
        `\nMutants that did not fail at their last step:\n- ${this.wrong.join("\n- ")}\n`,
      );
      return { status: "failed" as const };
    }
    console.log(`\n${this.checked} mutants, each failed at its last step.`);
    return undefined;
  }
}
