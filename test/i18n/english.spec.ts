import { expect, test, type Page } from "@playwright/test";
import {
  cartWritten,
  dishCard,
  gotoHydrated,
  waitForHydration,
} from "../bdd/support/storefront";
import { germanLeftovers } from "./germanLeftovers";

/**
 * The main flows of an English shop (ADR 0002): a build with
 * NUXT_SHOPBITE_LOCALE=en and the test seams, on the memory backend
 * (`pnpm test:i18n:en`, CI job `english`). It asserts English texts and
 * paths and that no page a guest reads has German left (the menu's own
 * data aside, which is the restaurant's).
 */

test.beforeEach(async ({ request }) => {
  // a fresh demo restaurant, open now (test/bdd/seam)
  const response = await request.post("/api/_test/scenario", { data: {} });
  expect(response.ok(), "a build with SHOPBITE_TEST_SEAMS=1").toBe(true);
});

async function expectEnglish(page: Page) {
  await waitForHydration(page);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  expect(await germanLeftovers(page), page.url()).toEqual([]);
}

const email = () =>
  `guest-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

test("a guest orders a dish for pickup", async ({ page }) => {
  await gotoHydrated(page, "/");
  await expectEnglish(page);

  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Menu", exact: true })
    .click();
  await page.waitForURL(/\/Menu\/$/);
  await expectEnglish(page);

  await dishCard(page, "Spaghetti Bolognese").getByRole("link").click();
  const sheet = page.getByRole("dialog", { name: /Spaghetti Bolognese$/ });
  await expect(sheet).toBeVisible();
  await expectEnglish(page);
  await Promise.all([
    cartWritten(page),
    sheet.getByRole("button", { name: /^Add to basket/ }).click(),
  ]);
  await expect(sheet).toBeHidden();

  await page
    .getByRole("banner")
    .getByRole("button", { name: "Basket, 1 item" })
    .click();
  const basket = page.getByRole("dialog", { name: "Your order" });
  await expect(basket).toBeVisible();
  await expectEnglish(page);
  await basket.getByRole("link", { name: "Go to checkout" }).click();

  await page.waitForURL(/\/order\/checkout$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Checkout" }),
  ).toBeVisible();
  await expectEnglish(page);

  const pickup = page
    .getByRole("radiogroup", { name: "Shipping methods" })
    .getByRole("radio", { name: "Pickup" });
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/checkout/selection")),
    pickup.check(),
  ]);
  await expect(
    page
      .getByRole("region", { name: /When\?/ })
      .getByRole("textbox", { name: "Requested pickup time" }),
  ).toBeVisible();

  const details = page.getByRole("region", { name: /Your details/ });
  const guest = email();
  for (const [label, value] of [
    ["First name", "Sam"],
    ["Last name", "Sample"],
    ["Email", guest],
    ["Street and house number", "1 Sample Street"],
    ["Postcode", "12345"],
    ["Town or city", "Sampletown"],
    ["Phone", "0123456789"],
  ] as const) {
    await details
      .getByRole("textbox", { name: label, exact: true })
      .fill(value);
  }
  await details.getByRole("checkbox", { name: /privacy policy/ }).check();
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/checkout/guest") &&
        r.request().method() === "POST",
    ),
    details.getByRole("button", { name: "Save details" }).click(),
  ]);
  await expect(details.getByText(guest)).toBeVisible();
  await expectEnglish(page);

  // a code the restaurant does not know: the shop's words, not the
  // backend's text (the memory backend's is in its own language)
  await page.getByRole("textbox", { name: "Voucher code" }).fill("NOPE10");
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/cart/vouchers") &&
        r.request().method() === "POST",
    ),
    page.getByRole("button", { name: "Redeem", exact: true }).click(),
  ]);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "This voucher code is invalid or has expired." }),
  ).toBeVisible();
  await expectEnglish(page);

  await page
    .getByRole("button", { name: "Order with obligation to pay", exact: true })
    .click();
  await page.waitForURL(/\/order\/[^/]+\/success$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Thank you for your order",
  );
  await expect(
    page.getByRole("main").getByText("Requested time"),
  ).toBeVisible();
  await expectEnglish(page);
});

test("a customer registers, uses the account and logs in again", async ({
  page,
}) => {
  await gotoHydrated(page, "/register");
  await expect(
    page.getByRole("heading", { level: 1, name: "Register" }),
  ).toBeVisible();
  await expectEnglish(page);

  const form = page.getByRole("main");
  const customer = email();
  const password = "a-long-password-1";
  for (const [label, value] of [
    ["First name", "Alex"],
    ["Last name", "Sample"],
    ["Email", customer],
    ["Password", password],
    ["Repeat password", password],
    ["Street and house number", "1 Sample Street"],
    ["Postcode", "12345"],
    ["Town or city", "Sampletown"],
    ["Phone", "0123456789"],
  ] as const) {
    await form.getByRole("textbox", { name: label, exact: true }).fill(value);
  }
  await form.getByRole("checkbox", { name: /privacy policy/ }).check();
  await form.getByRole("button", { name: "Save details" }).click();

  await page.waitForURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Hello Alex",
  );
  await expect(page).toHaveTitle(/^My account/);
  await expectEnglish(page);

  for (const [link, path] of [
    ["Orders", /\/account\/orders$/],
    ["Profile", /\/account\/profile$/],
    ["Addresses", /\/account\/addresses$/],
    ["Overview", /\/account$/],
  ] as const) {
    await page
      .getByRole("navigation", { name: /account/i })
      .getByRole("link", { name: link, exact: true })
      .click();
    await page.waitForURL(path);
    await expectEnglish(page);
  }

  await page
    .getByRole("main")
    .getByRole("button", { name: "Log out", exact: true })
    .click();
  await page.waitForURL(/\/login$/);
  await expectEnglish(page);

  await page
    .getByRole("main")
    .getByRole("textbox", { name: "Email", exact: true })
    .fill(customer);
  await page
    .getByRole("main")
    .getByLabel("Password", { exact: true })
    .fill(password);
  await page
    .getByRole("main")
    .getByRole("button", { name: "Log in", exact: true })
    .click();
  // the login page leads home or to the account, as in German
  await expect(
    page.getByRole("banner").getByRole("link", { name: "My account" }),
  ).toBeVisible();
  await expectEnglish(page);
});

test("the shop's other pages are English at English paths", async ({
  page,
  request,
}) => {
  for (const path of [
    "/search?q=pizza",
    "/favourites",
    "/contact",
    "/forgot-password",
    "/account/recover/password?hash=unknown",
    "/register/confirm?em=a&hash=b",
    "/imprint",
    "/privacy",
    "/terms",
    "/delivery-and-payment",
    "/no-such-page",
  ]) {
    await gotoHydrated(page, path);
    await expectEnglish(page);
  }
  // the German paths are not the English shop's
  for (const path of ["/bestellung/kasse", "/konto", "/merkliste", "/agb"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /favourites");
  expect(robots).not.toContain("/merkliste");
  const llms = await (await request.get("/llms.txt")).text();
  expect(llms).toContain("## Opening hours");
  expect(llms).not.toMatch(/Öffnungszeiten|Bestellen|Kontakt/);
});
