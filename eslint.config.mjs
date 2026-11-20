// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'
import eslintConfigPrettier from 'eslint-config-prettier'

export default withNuxt(
  {
    rules: {
      "vue/no-watch-after-await": "error",
      "vue/no-lifecycle-after-await": "error",
      "vue/multi-word-component-names": "off",
    },
  },
  {
    // ADR 0001: only the Shopware adapter talks Shopware. A warning while
    // the code moves to the ports (steps 1–7), an error from 3.0 (step 8).
    name: "shopbite/backend-agnostic",
    ignores: [
      "server/adapters/shopware/**",
      // generated Store API types and their module augmentation
      "api-types/**",
      "shopware.d.ts",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "warn",
        {
          // `#shopware` as a path: in the gitignore syntax of `patterns` a
          // leading # starts a comment
          paths: [
            {
              name: "#shopware",
              message:
                "Shopware belongs in server/adapters/shopware; use the ports and the domain types (shared/domain), see docs/adr/0001-backend-agnostic-storefront.md.",
            },
          ],
          patterns: [
            {
              group: ["@shopware/*"],
              message:
                "Shopware belongs in server/adapters/shopware; use the ports and the domain types (shared/domain), see docs/adr/0001-backend-agnostic-storefront.md.",
            },
            {
              group: ["~~/api-types/*", "**/api-types/*"],
              message:
                "The Store API types belong in server/adapters/shopware; use the domain types (shared/domain), see docs/adr/0001-backend-agnostic-storefront.md.",
            },
          ],
        },
      ],
    },
  },
  eslintConfigPrettier,
);
