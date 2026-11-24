import { test as base, createBdd } from "playwright-bdd";
import { backendName, createBackend, type Backend } from "../support/backends";

/** What a scenario remembers between its steps. */
export type World = {
  /** The visitor's account (or guest) e-mail and password. */
  email: string;
  password: string;
  /** The wished time ("HH:MM") the checkout was left with. */
  wishedTime?: string;
  /** Links of the last mail a step looked for. */
  mailLinks?: readonly string[];
};

/**
 * Tags that keep a scenario off a backend, with the reason in the feature
 * file. The skip shows in the report with this text.
 */
const ONLY: Record<string, Backend["name"]> = {
  "@memory-only": "memory",
  "@shopware-only": "shopware",
};

let counter = 0;
const unique = () =>
  `${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const test = base.extend<{ backend: Backend; world: World }>({
  // every scenario starts with the open demo restaurant (auto fixture)
  backend: [
    async ({ request }, use, testInfo) => {
      const name = backendName();
      for (const tag of testInfo.tags) {
        const only = ONLY[tag];
        if (only && only !== name) {
          testInfo.skip(true, `${tag}: not run against the ${name} backend`);
        }
      }
      const backend = createBackend(name, request);
      await backend.start();
      await use(backend);
      await backend.finish();
    },
    { auto: true },
  ],
  // Playwright reads the fixtures a fixture needs from its first parameter
  // eslint-disable-next-line no-empty-pattern
  world: async ({}, use) => {
    await use({
      email: `bdd-${unique()}@example.com`,
      password: `Bdd-${unique()}-pass`,
    });
  },
});

export const { Given, When, Then } = createBdd(test);
