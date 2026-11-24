import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import {
  availableLocales,
  compileMessages,
  loadMessages,
  messagesModule,
} from "../../i18n/messages";

const storefront = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** A shop layer on disk with its own locale files. */
function shop(files: Record<string, unknown>): string {
  const root = mkdtempSync(join(tmpdir(), "shop-messages-"));
  for (const [path, content] of Object.entries(files)) {
    const file = join(root, "i18n", "locales", path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(content));
  }
  return root;
}

// What the bundles run: the message engine without its compiler
// (modules/locale.ts defines the flag for the client and server builds).
let createTranslator: typeof import("../../i18n/runtime/translator").createTranslator;
beforeAll(async () => {
  (globalThis as Record<string, unknown>).__INTLIFY_DROP_MESSAGE_COMPILER__ =
    true;
  ({ createTranslator } = await import("../../i18n/runtime/translator"));
});

function translator(messages: Record<string, unknown>, fallback?: string) {
  return createTranslator({
    locale: "xx",
    fallbackLocale: fallback ?? null,
    messages,
  }).t;
}

describe("the shop's messages", () => {
  it("lists the storefront's locales and the ones a shop adds", () => {
    const root = shop({ "nl.json": { common: {} }, "de.json": {} });
    expect(availableLocales([storefront])).toEqual(["de", "en"]);
    expect(availableLocales([root, storefront])).toEqual(["de", "en", "nl"]);
  });

  it("merges a shop's message over the storefront's, the rest stays", () => {
    const root = shop({
      "de.json": { menu: { cart: { title: "Ihre Bestellung" } } },
    });
    const storefrontOnly = loadMessages([storefront], "de");
    const merged = loadMessages([root, storefront], "de");
    expect(merged.menu).toMatchObject({ cart: { title: "Ihre Bestellung" } });
    expect(Object.keys(merged)).toEqual(Object.keys(storefrontOnly));
    expect((merged.common as Record<string, unknown>).header).toEqual(
      (storefrontOnly.common as Record<string, unknown>).header,
    );
  });

  it("reads a shop's locale folder like the storefront's", () => {
    const root = shop({ "nl/menu.json": { menu: { a: "x" } } });
    expect(loadMessages([root, storefront], "nl")).toEqual({
      menu: { a: "x" },
    });
  });

  it("refuses HTML and broken syntax at build time", () => {
    expect(() => compileMessages({ a: { b: "Read <b>this</b>" } })).toThrow(
      /a\.b contains HTML/,
    );
    expect(() => compileMessages({ a: "Hello {name" })).toThrow(
      /a is no valid message/,
    );
    expect(() => compileMessages({ a: "See @:b" })).toThrow(/links another/);
  });

  it("evaluates placeholders, plurals and escapes without the compiler", () => {
    const t = translator({
      xx: compileMessages({
        greet: "Hallo {name}",
        cart: "Warenkorb, 1 Artikel | Warenkorb, {count} Artikel",
        mail: "info{'@'}example.org",
      }),
    });
    expect(t("greet", { name: "Alex" })).toBe("Hallo Alex");
    expect(t("cart", 1)).toBe("Warenkorb, 1 Artikel");
    expect(t("cart", 3)).toBe("Warenkorb, 3 Artikel");
    expect(t("mail")).toBe("info@example.org");
  });

  it("keeps a static text a string, which needs no compiler", () => {
    const compiled = compileMessages({ a: "Warenkorb", b: "Hallo {name}" });
    expect(compiled.a).toBe("Warenkorb");
    expect(typeof compiled.b).toBe("object");
    expect(translator({ xx: compiled })("a")).toBe("Warenkorb");
  });

  it("answers the key for a message it does not have", () => {
    expect(translator({ xx: {} })("menu.nothing")).toBe("menu.nothing");
  });

  it("does not compile a message string at runtime (the compiler is gone)", () => {
    const t = translator({ xx: { greet: "Hallo {name}" } });
    expect(t("greet", { name: "Alex" })).not.toBe("Hallo Alex");
  });

  it("falls back to English for a message an added locale lacks", () => {
    const root = shop({ "xx.json": { common: { own: "eigen" } } });
    const source = messagesModule([root, storefront], ["xx", "en"]);
    const messages = JSON.parse(
      source.replace(/^export const messages = /, "").replace(/;\n$/, ""),
    );
    const t = translator(messages, "en");
    expect(t("common.own")).toBe("eigen");
    expect(t("common.header.cartLabel", 2)).toBe(
      translator({ xx: messages.en })("common.header.cartLabel", 2),
    );
    expect(t("common.header.cartLabel", 2)).toMatch(/2/);
  });

  it("compiles every message of the storefront in both languages", () => {
    for (const code of ["de", "en"]) {
      expect(() =>
        compileMessages(loadMessages([storefront], code)),
      ).not.toThrow();
    }
  });
});
