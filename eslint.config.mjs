// @ts-check
import withNuxt from "./.nuxt/eslint.config.mjs";
import eslintConfigPrettier from "eslint-config-prettier";
import shopbite from "./eslint/noLiteralText.mjs";

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
  {
    // ADR 0002: every text a guest reads comes from the locale files
    // (i18n/locales): bare text in templates is refused.
    name: "shopbite/locale-texts",
    files: ["app/**/*.vue"],
    rules: {
      "vue/no-bare-strings-in-template": [
        "error",
        {
          allowlist: [
            "(", ")", ",", ".", "&", "+", "-", "=", "*", "/", "#", "%", "!", "?",
            ":", ";", "[", "]", "{", "}", "<", ">", "|", "·", "•", "–", "—", "−",
            "×", "…", "€", "@", "\u00a0", "/^[\\d\\s.,:–-]+$/",
          ],
          attributes: {
            "/.+/": [
              "title",
              "aria-label",
              "aria-placeholder",
              "aria-roledescription",
              "aria-valuetext",
              "placeholder",
              "alt",
              // the texts of the base components (app/components/Sb)
              "label",
              "hint",
              "legend",
              "description",
              "trailing",
              "confirm-label",
              "cancel-label",
              "item-name",
            ],
          },
          directives: ["v-text"],
        },
      ],
    },
  },
  {
    // ADR 0002: a string that reads like text for people (any language)
    // in the app's scripts, template expressions and attributes, and in
    // the server's text for people (llms.txt), is a text outside the
    // locale files. Keys, identifiers, paths, classes and codes are not.
    name: "shopbite/literal-text",
    files: [
      "app/**/*.{ts,vue}",
      "server/routes/llms.txt.ts",
      "server/utils/llmsTxt.ts",
    ],
    plugins: { shopbite },
    rules: { "shopbite/no-literal-text": "error" },
  },
  eslintConfigPrettier,
);
