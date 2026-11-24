import { expect, type Locator, type Page } from "@playwright/test";
import type { DataTable } from "playwright-bdd";
import { Given, Then, When } from "./fixtures";
import {
  addFromSheet,
  cartWritten,
  dishCard,
  escape,
  gotoHydrated,
  openDish,
  openMenu,
  openSection,
  waitForHydration,
} from "../support/storefront";

const column = (table: DataTable) => table.raw().map(([cell]) => cell!);

When("I open the menu", async ({ page }) => {
  await openMenu(page);
});

Then("I see the menu sections", async ({ page }, table: DataTable) => {
  const sections = page.getByRole("navigation", { name: "Kategorien" });
  for (const name of column(table)) {
    await expect(
      sections.getByRole("link", { name, exact: true }),
    ).toBeVisible();
  }
});

When("I open the menu section {string}", async ({ page }, name: string) => {
  await openSection(page, name);
});

Then(
  "the section says it has {int} dishes",
  async ({ page }, count: number) => {
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      new RegExp(`${count} Gerichte$`),
    );
    await expect(page.getByRole("main").getByRole("article")).toHaveCount(
      count,
    );
  },
);

Then(
  "I see the dish {string} from {string}",
  async ({ page }, name: string, price: string) => {
    const card = dishCard(page, name);
    await expect(card).toBeVisible();
    await expect(card).toContainText(price);
  },
);

When("I search the menu for {string}", async ({ page }, query: string) => {
  await openMenu(page);
  const search = page.getByRole("search");
  await search
    .getByRole("searchbox", { name: "Speisekarte durchsuchen" })
    .fill(query);
  await search.getByRole("button", { name: "Suchen" }).click();
  await page.waitForURL(/\/suche/);
  await gotoHydrated(page, page.url());
});

Then("I see exactly these dishes", async ({ page }, table: DataTable) => {
  const names = page
    .getByRole("main")
    .getByRole("article")
    .getByRole("heading", { level: 3 });
  // in any order: a search answers by relevance, which backends rank alike
  // only roughly; the heading reads "Nr. <number> <name>"
  const expected = column(table).sort();
  await expect
    .poll(async () =>
      (await names.allTextContents())
        .map((text) => text.replace(/^Nr\. \S+\s+/, "").trim())
        .sort(),
    )
    .toEqual(expected);
});

When("I sort the dishes by {string}", async ({ page }, sorting: string) => {
  await page
    .getByRole("combobox", { name: "Sortierung" })
    .selectOption({ label: sorting });
  await page.waitForLoadState("networkidle");
});

Then("the first dish is {string}", async ({ page }, name: string) => {
  await expect(
    page
      .getByRole("main")
      .getByRole("article")
      .first()
      .getByRole("heading", { level: 3 }),
  ).toHaveText(new RegExp(`${name}$`));
});

/** A dish the way the guest wants it, through its dish sheet. */
async function addDish(
  page: Parameters<typeof openDish>[0],
  name: string,
  choose: (
    sheet: Awaited<ReturnType<typeof openDish>>,
  ) => Promise<void> = async () => {},
) {
  const sheet = await openDish(page, name);
  await choose(sheet);
  await addFromSheet(page, sheet);
}

const withExtra =
  (extra: string) => async (sheet: Awaited<ReturnType<typeof openDish>>) => {
    await sheet
      .getByRole("checkbox", { name: new RegExp(`^${extra} `) })
      .check();
  };

When("I add a {string} to the cart", async ({ page }, name: string) => {
  await addDish(page, name);
});

When(
  "I add a {string} with {string} to the cart",
  async ({ page }, name: string, extra: string) => {
    await addDish(page, name, withExtra(extra));
  },
);

When(
  "I add a {string} without {string} to the cart",
  async ({ page }, name: string, ingredient: string) => {
    await addDish(page, name, async (sheet) => {
      const chip = sheet
        .getByRole("group", { name: "Zutaten" })
        .getByRole("button", { name: ingredient, exact: true });
      await chip.click();
      await expect(chip).toHaveAttribute("aria-pressed", "false");
    });
  },
);

When(
  "I add a {string} in size {string} to the cart",
  async ({ page }, name: string, size: string) => {
    await addDish(page, name, async (sheet) => {
      await sheet.getByRole("radio", { name: size, exact: true }).check();
      await expect(
        sheet.getByRole("button", { name: /^In den Warenkorb/ }),
      ).toBeEnabled();
    });
  },
);

Given("my cart holds a {string}", async ({ page }, name: string) => {
  await addDish(page, name);
});

Given(
  "my cart holds a {string} with {string}",
  async ({ page }, name: string, extra: string) => {
    await addDish(page, name, withExtra(extra));
  },
);

When(
  "I add {string} from the menu section {string}",
  async ({ page }, name: string, section: string) => {
    await openSection(page, name === section ? name : section);
    const add = dishCard(page, name).getByRole("button", {
      name: `${name} hinzufügen`,
    });
    // cards hydrate when they come close to the viewport
    await add.scrollIntoViewIfNeeded();
    await expect(async () => {
      await Promise.all([cartWritten(page), add.click()]);
    }).toPass({ timeout: 20_000 });
  },
);

const PAUSED = "Es werden aktuell keine weiteren Bestellungen mehr aufgenommen";

/** Presses an add button if the page offers one, until a cart write answers. */
async function tryToAdd(page: Page, button: Locator) {
  if (!(await button.count())) return;
  await button.scrollIntoViewIfNeeded();
  // a card that has not hydrated yet drops the click: press again
  await expect(async () => {
    await Promise.all([
      cartWritten(page).then(
        () => undefined,
        () => undefined,
      ),
      button.click({ timeout: 2000 }),
    ]);
    await page.waitForLoadState("networkidle");
  })
    .toPass({ timeout: 10_000 })
    .catch(() => {});
}

Then("I cannot add {string} to my cart", async ({ page }, name: string) => {
  const card = dishCard(page, name);
  await expect(card).toBeVisible();
  // really try: from the card, then from the dish sheet
  await tryToAdd(
    page,
    card.getByRole("button", { name: `${name} hinzufügen` }),
  );
  await card.getByRole("link").click();
  const sheet = page.getByRole("dialog", {
    name: new RegExp(`${escape(name)}$`),
  });
  await expect(sheet).toBeVisible();
  await waitForHydration(page);
  await tryToAdd(
    page,
    sheet.getByRole("button", { name: /^In den Warenkorb/ }),
  );
  // asked of the backend, not of the page
  const cart = await (await page.request.get("/api/cart")).json();
  expect(
    cart.lines.map((line: { name: string }) => line.name),
    "cart lines in the backend",
  ).toEqual([]);
  await expect(sheet.getByText(PAUSED)).toBeVisible();
});

Then(
  "the dish {string} says the restaurant takes no orders right now",
  async ({ page }, name: string) => {
    await gotoHydrated(page, page.url().replace(/\?.*$/, ""));
    await expect(
      dishCard(page, name).getByText("Gerade keine Bestellungen"),
    ).toBeVisible();
  },
);

When("I filter the dishes by {string}", async ({ page }, group: string) => {
  await page
    .getByRole("main")
    .getByRole("button", { name: "Filter", exact: true })
    .click();
  const filters = page.getByRole("dialog", { name: "Filter" });
  const show = filters.getByRole("button", { name: /^\d+ Gerichte? zeigen$/ });
  const before = await show.textContent();
  await filters
    .getByRole("group", { name: group, exact: true })
    .getByRole("checkbox", { name: "Ja" })
    .check();
  // the button counts the filtered dishes before it shows them
  await expect(show).not.toHaveText(before!);
  await show.click();
  await expect(filters).toBeHidden();
  await page.waitForLoadState("networkidle");
});
