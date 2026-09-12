// Screenshot comparison of the pages the stylesheet work touches (#319).
// Run against the production build behind scripts/perf/h2-proxy.cjs:
//   pnpm playwright test --config test/visual/playwright.config.ts --update-snapshots   # baseline
//   pnpm playwright test --config test/visual/playwright.config.ts                      # compare
import { test, expect, type Page } from "@playwright/test";

const modes = ["light", "dark"] as const;

async function settle(page: Page) {
  // hydrate scroll-based sections and reveal AnimatedSection blocks
  const h = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h + 800; y += 500) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
}

async function open(page: Page, path: string, mode: string) {
  await page.addInitScript((m) => {
    try {
      localStorage.setItem("nuxt-color-mode", m);
    } catch {
      // storage can be unavailable in the sandboxed init script
    }
  }, mode);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(path, { waitUntil: "networkidle" });
  await page.addStyleTag({
    content:
      "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
  });
  await settle(page);
}

for (const mode of modes) {
  test.describe(mode, () => {
    test("home", async ({ page }) => {
      await open(page, "/", mode);
      await expect(page).toHaveScreenshot(`home-${mode}.png`, {
        fullPage: true,
      });
      await expect(page.locator("footer").first()).toHaveScreenshot(
        `footer-${mode}.png`,
      );
    });

    test("category", async ({ page }) => {
      await open(page, "/c/Pizza/", mode);
      await expect(page).toHaveScreenshot(`category-${mode}.png`, {
        fullPage: true,
      });
    });

    test("cart drawer and checkout", async ({ page }) => {
      await open(page, "/c/Pizza/", mode);
      const card = page.locator('[id^="product-card-"]').first();
      await card.scrollIntoViewIfNeeded();
      await card.locator("button .i-lucide\\:shopping-cart").click();
      const add = page.getByRole("button", { name: "In den Warenkorb" });
      await expect(add).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(300);
      await expect(page).toHaveScreenshot(`card-options-${mode}.png`);
      await add.click();
      await expect(add).not.toBeVisible({ timeout: 10000 });
      await page
        .locator("button .i-lucide\\:shopping-bag")
        .locator("..")
        .first()
        .click();
      const drawer = page.locator('[data-vaul-drawer][data-state="open"]');
      await expect(drawer).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(800);
      await expect(page).toHaveScreenshot(`cart-drawer-${mode}.png`);
      await page.goto("/bestellung/warenkorb", { waitUntil: "networkidle" });
      await page.addStyleTag({
        content:
          "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
      });
      await settle(page);
      await expect(page).toHaveScreenshot(`checkout-${mode}.png`, {
        fullPage: true,
      });
    });
  });
}
