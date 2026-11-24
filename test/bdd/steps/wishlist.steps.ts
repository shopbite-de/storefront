import { expect, type Locator, type Page } from "@playwright/test";
import { Given, Then, When } from "./fixtures";
import { escape, gotoHydrated, logIn, openDish } from "../support/storefront";

async function saveToWishlist(
  page: Page,
  name: string,
  choose?: (sheet: Locator) => Promise<void>,
) {
  const sheet = await openDish(page, name);
  await choose?.(sheet);
  const heart = sheet.getByRole("button", { name: `${name} merken` });
  await heart.click();
  await expect(heart).toHaveAttribute("aria-pressed", "true");
}

When(
  "I save a {string} with {string} to my wishlist",
  async ({ page }, name: string, extra: string) => {
    await saveToWishlist(page, name, async (sheet) => {
      await sheet
        .getByRole("checkbox", { name: new RegExp(`^${escape(extra)} `) })
        .check();
    });
  },
);

Given(
  "I saved a {string} to my wishlist as a guest",
  async ({ page }, name: string) => {
    await saveToWishlist(page, name);
  },
);

async function wishlistRow(page: Page, name: string) {
  await gotoHydrated(page, "/merkliste");
  return page
    .getByRole("main")
    .getByRole("listitem", { name: new RegExp(`^${escape(name)}\\b`) });
}

Then("my wishlist shows {string}", async ({ page }, name: string) => {
  await expect(await wishlistRow(page, name)).toBeVisible();
});

Then(
  "my wishlist shows {string} with {string}",
  async ({ page }, name: string, extra: string) => {
    const row = await wishlistRow(page, name);
    await expect(row).toBeVisible();
    await expect(row).toContainText(extra);
  },
);

Then(
  "my wishlist shows {string} on another device too",
  async ({ browser, baseURL, world }, name: string) => {
    const context = await browser.newContext({ baseURL });
    try {
      const page = await context.newPage();
      await logIn(page, world.email, world.password);
      await expect(await wishlistRow(page, name)).toBeVisible();
    } finally {
      await context.close();
    }
  },
);
