import { RuleTester } from "eslint";
import { describe, it } from "vitest";
import { noGermanText } from "../../eslint/noGermanText.mjs";

// RuleTester reports through the test framework's describe/it
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/**
 * The guard of ADR 0002: German UI texts in code fail the lint, route
 * names, query parameters, constants and English texts do not.
 */
new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: "module" },
}).run("shopbite/no-german-text", noGermanText, {
  valid: [
    'navigateTo({ name: "konto-profil" });',
    'const query = { produkt: "SB-1", ohne: "zwiebeln" };',
    'const codes = ["UND_ERR_SOCKET", "ETIMEDOUT"];',
    'const label = t("order.cartBar.title");',
    'const text = "Add to basket";',
    "const greeting = `Hello ${name}`;",
  ],
  invalid: [
    {
      code: 'const title = "Ihre Bestellung";',
      errors: [{ messageId: "german" }],
    },
    {
      code: 'const label = "Schließen";',
      errors: [{ messageId: "german" }],
    },
    {
      code: "const items = `${count} Artikel im Warenkorb`;",
      errors: [{ messageId: "german" }],
    },
  ],
});
