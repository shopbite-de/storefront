import { describe } from "vitest";
import type { Backend, PortName } from "../../server/ports";

/**
 * Contract tests (ADR 0001): one suite per port describes what every
 * adapter must do; `runContract` runs it once per adapter. A suite talks
 * about a scenario in domain terms; each adapter fixture builds a backend
 * that holds this scenario (the memory adapter from its seed, the Shopware
 * adapter from a fake Store API answering Shopware JSON).
 */
export type AdapterFixture<Scenario> = Readonly<{
  /** Adapter name as in `shopBite.backend`. */
  adapter: string;
  /** A fresh backend holding the scenario. */
  create: (scenario: Scenario) => Backend | Promise<Backend>;
}>;

export type Contract<P extends PortName, Scenario> = Readonly<{
  port: P;
  /**
   * Registers the tests (`it`). `given` builds the port of the adapter
   * under test for a scenario.
   */
  suite: (given: (scenario: Scenario) => Promise<Backend[P]>) => void;
}>;

export function defineContract<P extends PortName, Scenario>(
  port: P,
  suite: Contract<P, Scenario>["suite"],
): Contract<P, Scenario> {
  return { port, suite };
}

export function runContract<P extends PortName, Scenario>(
  contract: Contract<P, Scenario>,
  fixtures: readonly AdapterFixture<Scenario>[],
): void {
  for (const fixture of fixtures) {
    describe(`${contract.port} contract [${fixture.adapter}]`, () => {
      contract.suite(
        async (scenario) => (await fixture.create(scenario))[contract.port],
      );
    });
  }
}
