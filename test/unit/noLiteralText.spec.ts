import { RuleTester } from "eslint";
import vueParser from "vue-eslint-parser";
import { describe, expect, it } from "vitest";
import { noLiteralText, readsLikeText } from "../../eslint/noLiteralText.mjs";

// RuleTester reports through the test framework's describe/it
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

/**
 * The guard of ADR 0002: a string that reads like text for people, in any
 * language, fails the lint outside the locale files; keys, identifiers,
 * classes, paths and codes do not. No word list: "Preis" fails because it
 * is a word, not because it is German.
 */
const text = [{ messageId: "text" }];

new RuleTester({
  languageOptions: { ecmaVersion: 2024, sourceType: "module" },
}).run("shopbite/no-literal-text (scripts)", noLiteralText, {
  valid: [
    'const label = t("order.cartBar.title");',
    'navigateTo({ name: "konto-profil" });',
    'const query = { produkt: "SB-1", ohne: "zwiebeln", extras: "x" };',
    'const codes = ["UND_ERR_SOCKET", "ETIMEDOUT", "EUR"];',
    'const classes = "flex items-center gap-2 sm:col-span-6 hover:bg-sb-muted";',
    'const sizes = "(min-width: 1024px) 360px, 100vw";',
    'const zone = "Europe/Berlin"; const type = "text/plain; charset=utf-8";',
    'const url = "https://example.org/a?b=c"; const path = "/konto/profil";',
    'const icon = "M12 5v14"; const id = `${prefix}-fehler`;',
    'if (event.key === "Escape") close();',
    "const key = `auth.errors.${code}Moment`;",
    'throw new Error("Cart could not be loaded");',
    'console.error("[cart] refresh failed", error);',
    'throw createError({ statusCode: 404, statusMessage: "Page not found" });',
    'const ld = { "@type": "Restaurant", openingHours: "Monday" };',
    'import x from "Some Module";',
    'const header = { "Content-Type": "application/json" };',
    "const width = `${size}px`; const id = `${prefix}-fehler`;",
    "const classes = `flex ${gap} sm:grid`;",
    'const ok = header.startsWith("Bearer ");',
    "const csp = [\"'self'\", \"'unsafe-inline'\"];",
    'throw invalidValue("Money needs a finite amount.");',
    'const mode = ref("delivery");',
  ],
  invalid: [
    { code: 'const price = "Preis";', errors: text },
    { code: 'const title = "Ihre Bestellung";', errors: text },
    { code: 'const label = "Add to basket";', errors: text },
    { code: "const items = `${count} Artikel im Warenkorb`;", errors: text },
    {
      code: 'const a = open ? "Schließen" : "Öffnen";',
      errors: [...text, ...text],
    },
    { code: 'setError({ message: "Bitte prüfen" });', errors: text },
    // sentences from placeholders and lower-case words
    { code: "const s = `${a} oder ${b}`;", errors: text },
    { code: 'const s = names.join(" und ");', errors: text },
    { code: "const s = `${n} min`;", errors: text },
    { code: 'const item = { label: "bestellen" };', errors: text },
  ],
});

new RuleTester({
  languageOptions: {
    parser: vueParser,
    ecmaVersion: 2024,
    sourceType: "module",
  },
}).run("shopbite/no-literal-text (templates)", noLiteralText, {
  valid: [
    '<template><p>{{ $t("menu.title") }}</p></template>',
    '<template><NuxtLink :to="{ name: \'konto\' }" class="font-bold underline">{{ $t("a.b") }}</NuxtLink></template>',
    '<template><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></template>',
    '<template><img sizes="(min-width: 640px) 50vw, 100vw" src="/a.png" /></template>',
    '<template><SbButton variant="secondary" icon="i-lucide-pizza" /></template>',
    "<template><input :autocomplete=\"open ? 'given-name' : 'off'\" /></template>",
    '<template><div :class="`flex ${gap}`" :aria-label="$t(\'menu.close\')" /></template>',
    '<script setup>\nconst mode = ref("delivery");\n</script>\n<template><p :data-mode="mode">{{ $t("a.b") }}</p></template>',
  ],
  invalid: [
    {
      code: '<template><p>{{ true ? "Lieferadresse" : "x" }}</p></template>',
      errors: [...text, ...text], // both branches render
    },
    {
      code: '<template><SbBadge text="Neu" /></template>',
      errors: text,
    },
    {
      code: '<template><p :title="`Preis: ${price}`" /></template>',
      errors: text,
    },
    {
      code: '<script setup>\nconst label = "Preis";\n</script>\n<template><p /></template>',
      errors: text,
    },
    {
      code: '<script setup>\nconst label = ref("bestellen");\n</script>\n<template><button>{{ label }}</button></template>',
      errors: text,
    },
    {
      code: "<template><button :aria-label=\"open ? 'schliessen' : 'oeffnen'\" /></template>",
      errors: [...text, ...text],
    },
    {
      code: "<template><p>{{ open ? 'offen' : 'zu' }}</p></template>",
      errors: [...text, ...text],
    },
  ],
});

describe("readsLikeText", () => {
  it("tells words from identifiers", () => {
    expect(readsLikeText("Preis")).toBe(true);
    expect(readsLikeText("Lieferadresse ändern")).toBe(true);
    expect(readsLikeText("order.voucher.invalid")).toBe(false);
    expect(readsLikeText("NuxtLink")).toBe(false);
    expect(readsLikeText("12:30 – 14:00")).toBe(false);
  });
});
