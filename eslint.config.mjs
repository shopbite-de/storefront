// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintConfigPrettier from "eslint-config-prettier";

export default withNuxt(
  {
    rules: {
      "vue/no-watch-after-await": "error",
      "vue/no-lifecycle-after-await": "error",
      "vue/multi-word-component-names": "off",
    },
  },
  {
    // ADR 0001: only the Shopware adapter talks Shopware (an error since
    // 3.0, step 8; a warning during steps 1–7).
    name: "shopbite/backend-agnostic",
    ignores: [
      "server/adapters/shopware/**",
      // generated Store API types
      "api-types/**",
    ],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
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
              // `\\#` escapes the comment character for subpaths
              group: ["\\#shopware/*", "@shopware/*"],
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
