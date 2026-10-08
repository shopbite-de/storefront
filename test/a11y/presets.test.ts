import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Accessibility checks of the preset pages (#446): axe (WCAG 2.1 AA) on
 * home, menu, product sheet, cart and checkout. Serious and critical
 * violations fail; the full report is attached to the test. The preset is
 * chosen at build time (NUXT_SHOPBITE_PRESET), CI runs one build per preset.
 * Reads the menu of the configured backend, never registers or orders.
 */
const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoSeriousViolations(page: Page, name: string) {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  await test.info().attach(`axe-${name}.json`, {
    body: JSON.stringify(results.violations, null, 2),
    contentType: "application/json",
  });
  const serious = results.violations
    .filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({
      rule: v.id,
      impact: v.impact,
      help: v.help,
      targets: v.nodes.slice(0, 5).map((node) => node.target.join(" ")),
    }));
  expect(serious, `${name}: serious axe violations`).toEqual([]);
}

/** Waits until Nuxt has hydrated, so clicks reach their handlers. */
async function gotoHydrated(page: Page, url: string) {
  await page.goto(url);
  await page.waitForFunction(
    () =>
      (
        window as unknown as { useNuxtApp?: () => { isHydrating?: boolean } }
      ).useNuxtApp?.().isHydrating === false,
  );
  await page.waitForLoadState("networkidle");
}

async function menuUrl(page: Page) {
  await gotoHydrated(page, "/");
  const href = await page
    .locator('main a[href*="peisekarte/"]:not([href*="produkt="])')
    .first()
    .getAttribute("href");
  expect(href, "home page links to the menu").toBeTruthy();
  return href!;
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("home page", async ({ page }) => {
  await gotoHydrated(page, "/");
  await expect(page.locator("html")).toHaveAttribute("data-preset", /.+/);
  await expectNoSeriousViolations(page, "home");
});

test("menu page", async ({ page }) => {
  await gotoHydrated(page, await menuUrl(page));
  await expect(page.locator("main h1")).toBeVisible();
  await expectNoSeriousViolations(page, "menu");
});

test("product sheet", async ({ page }) => {
  await gotoHydrated(page, await menuUrl(page));
  const productHref = await page
    .locator('main a[href*="produkt="]')
    .first()
    .getAttribute("href");
  expect(productHref, "menu lists a product").toBeTruthy();
  await gotoHydrated(page, productHref!);
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoSeriousViolations(page, "product-sheet");
});

test("cart and checkout", async ({ page }) => {
  await gotoHydrated(page, await menuUrl(page));
  const add = page
    .locator('[data-testid="menu-add"]:not([aria-haspopup])')
    .first();
  // cards hydrate when they come close to the viewport
  await add.scrollIntoViewIfNeeded();
  const cart = page.getByRole("button", { name: /^Warenkorb, / }).first();
  await expect(async () => {
    await add.click();
    await expect(cart).not.toHaveAccessibleName("Warenkorb, 0 Artikel", {
      timeout: 3000,
    });
  }).toPass({ timeout: 20000 });

  await cart.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expectNoSeriousViolations(page, "cart");

  await gotoHydrated(page, "/bestellung/kasse");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kasse");
  await expect(page.getByText("Ihr Warenkorb ist noch leer.")).toBeHidden();
  await expectNoSeriousViolations(page, "checkout");
});
