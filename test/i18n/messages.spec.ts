import { expect, test, type Page } from "@playwright/test";
import {
  cartWritten,
  dishCard,
  gotoHydrated,
  waitForHydration,
} from "../bdd/support/storefront";

/**
 * The messages as the browser gets them (ADR 0002), in a German and an
 * English build (Playwright projects `i18n-de` and `i18n-en`, memory
 * backend with test seams): compiled into the bundle, no request for
 * them, no message compiler, and no page that shows a message key or an
 * unfilled placeholder, neither rendered by the server nor by the browser
 * after hydration.
 */

test.beforeEach(async ({ request }) => {
  const response = await request.post("/api/_test/scenario", { data: {} });
  expect(response.ok(), "a build with SHOPBITE_TEST_SEAMS=1").toBe(true);
});

const WORDS = {
  de: {
    menu: "/speisekarte/",
    pages: [
      "/",
      "/speisekarte/",
      "/bestellung/kasse",
      "/anmelden",
      "/registrierung",
      "/passwort-vergessen",
      "/suche?query=pizza",
      "/merkliste",
      "/kontakt",
      "/impressum",
      "/datenschutz",
      "/agb",
      "/zahlung-und-versand",
      "/gibt-es-nicht",
    ],
    add: /^In den Warenkorb/,
    cart: (count: number) =>
      count === 1 ? "Warenkorb, 1 Artikel" : `Warenkorb, ${count} Artikel`,
    basket: "Ihre Bestellung",
    toCheckout: "Zur Kasse",
    legal:
      /^Mit der Bestellung akzeptieren Sie unsere AGB und die Datenschutzerklärung\.$/,
    terms: "AGB",
  },
  en: {
    menu: "/Menu/",
    pages: [
      "/",
      "/Menu/",
      "/order/checkout",
      "/login",
      "/register",
      "/forgot-password",
      "/search?query=pizza",
      "/favourites",
      "/contact",
      "/imprint",
      "/privacy",
      "/terms",
      "/delivery-and-payment",
      "/does-not-exist",
    ],
    add: /^Add to basket/,
    cart: (count: number) =>
      count === 1 ? "Basket, 1 item" : `Basket, ${count} items`,
    basket: "Your order",
    toCheckout: "Go to checkout",
    legal: /^By placing your order you accept our .+ and the .+\.$/,
    terms: "terms and conditions",
  },
} as const;

/** A message key (`menu.cart.title`) or an unfilled placeholder (`{count}`). */
const RAW =
  /\b(?:common|menu|order|auth|account|contact|server)\.[a-z][A-Za-z0-9]*(?:\.[a-z][A-Za-z0-9]*)*|\{\s*[a-zA-Z]\w*\s*\}/g;

const raw = (text: string) => [...new Set(text.match(RAW) ?? [])];

/** What a guest reads of the server's HTML: text and attributes, no scripts. */
const htmlText = (html: string) =>
  html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<link\b[^>]*>/gi, "");

/** What the browser shows: text, accessible names, alt texts, title, meta. */
const pageText = (page: Page) =>
  page.evaluate(() => {
    const parts = [document.title, document.body.innerText];
    for (const element of document.querySelectorAll("*")) {
      for (const name of ["aria-label", "title", "alt", "placeholder"]) {
        const value = element.getAttribute(name);
        if (value) parts.push(value);
      }
    }
    for (const meta of document.querySelectorAll("meta[content]")) {
      parts.push(meta.getAttribute("content") ?? "");
    }
    return parts.join("\n");
  });

async function localeOf(page: Page) {
  const lang = await page.locator("html").getAttribute("lang");
  expect(["de", "en"]).toContain(lang);
  return WORDS[lang as "de" | "en"];
}

test("no page shows a message key or an unfilled placeholder", async ({
  page,
  request,
}) => {
  await gotoHydrated(page, "/");
  const words = await localeOf(page);
  for (const path of words.pages) {
    const html = await (await request.get(path)).text();
    expect(raw(htmlText(html)), `server HTML of ${path}`).toEqual([]);
    await gotoHydrated(page, path);
    expect(raw(await pageText(page)), `${path} after hydration`).toEqual([]);
  }
});

test("placeholders, plurals and <i18n-t> render in the browser after hydration", async ({
  page,
}) => {
  await gotoHydrated(page, "/");
  const words = await localeOf(page);
  const cartButton = (count: number) =>
    page.getByRole("banner").getByRole("button", { name: words.cart(count) });
  // rendered by the server with a placeholder and the plural's other form
  await expect(cartButton(0)).toBeVisible();

  // the browser renders the menu, the sheet and the counts itself
  await page.goto(words.menu);
  await waitForHydration(page);
  for (const count of [1, 2]) {
    await dishCard(page, "Spaghetti Bolognese").getByRole("link").click();
    const sheet = page.getByRole("dialog", { name: /Spaghetti Bolognese$/ });
    await expect(sheet).toBeVisible();
    await Promise.all([
      cartWritten(page),
      sheet.getByRole("button", { name: words.add }).click(),
    ]);
    await expect(sheet).toBeHidden();
    await expect(cartButton(count)).toBeVisible();
  }
  expect(raw(await pageText(page))).toEqual([]);

  // a page the browser renders on navigation, with <i18n-t> and links
  await cartButton(2).click();
  await page
    .getByRole("dialog", { name: words.basket })
    .getByRole("link", { name: words.toCheckout })
    .click();
  await page.waitForURL(/\/(bestellung\/kasse|order\/checkout)$/);
  const legal = page.getByText(words.legal);
  await expect(legal).toBeVisible();
  await expect(legal.getByRole("link", { name: words.terms })).toBeVisible();
  expect(raw(await pageText(page))).toEqual([]);
});

test("the messages come with the bundle: no request, no message compiler", async ({
  page,
}) => {
  const requests: string[] = [];
  const scripts: Promise<string>[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("response", (response) => {
    if (/\/_nuxt\/.+\.js$/.test(response.url())) scripts.push(response.text());
  });
  await gotoHydrated(page, "/");
  expect(requests.filter((url) => /\/_i18n\/|messages/.test(url))).toEqual([]);
  const code = await Promise.all(scripts);
  expect(code.length).toBeGreaterThan(0);
  // the domains of @intlify/message-compiler's tokenizer and parser
  expect(
    code.filter((source) =>
      /["'`](?:tokenizer|parser|minifier)["'`]/.test(source),
    ),
  ).toEqual([]);
});
