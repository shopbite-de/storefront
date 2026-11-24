import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { defineVitestProject } from "@nuxt/test-utils/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: [
            "test/unit/**/*.{test,spec}.ts",
            // port contract suites against every adapter (ADR 0001)
            "test/contract/**/*.{test,spec}.ts",
          ],
          environment: "node",
        },
        resolve: {
          alias: {
            // written by modules/locale.ts in a Nuxt build (ADR 0002)
            "#shopbite-locale": fileURLToPath(
              new URL("./test/support/shopLocale.ts", import.meta.url),
            ),
          },
        },
      },
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["test/nuxt/*.{test,spec}.ts"],
          environment: "nuxt",
        },
      }),
    ],
  },
});
