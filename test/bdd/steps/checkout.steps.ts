import { expect, type Page } from "@playwright/test";
import { Then, When, type World } from "./fixtures";
import {
  definitionOf,
  escape,
  gotoHydrated,
  waitForHydration,
} from "../support/storefront";

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h! * 60 + m!;
};
const hhmm = (total: number) =>
  `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

/** The restaurant's clock now ("HH:MM" in its time zone). */
async function restaurantNow(page: Page): Promise<number> {
  const config = await (
    await page.request.get("/api/shop/config?fresh=1")
  ).json();
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: config.timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
  return minutes(parts);
}

const timeField = (page: Page) =>
  page
    .getByRole("region", { name: /Wann\?/ })
    .getByRole("textbox", { name: /^Wunsch(liefer|abhol)zeit$/ });

/** "Frühestmöglich ab 12:57 (heute), erlaubt: 10:00 – 22:00" */
async function timeWindow(page: Page) {
  const hint = page
    .getByRole("region", { name: /Wann\?/ })
    .getByText(/^Frühestmöglich ab/);
  await expect(hint).toBeVisible();
  const text = (await hint.textContent())!;
  const [, earliest, , until] =
    /ab (\d\d:\d\d).*?(erlaubt: \d\d:\d\d – (\d\d:\d\d))?$/.exec(text)!;
  return {
    earliest: minutes(earliest!),
    until: until ? minutes(until) : undefined,
  };
}

When("I go to the checkout", async ({ page }) => {
  await gotoHydrated(page, "/bestellung/kasse");
  await expect(
    page.getByRole("heading", { level: 1, name: "Kasse" }),
  ).toBeVisible();
});

When("I choose {string}", async ({ page }, method: string) => {
  const radio = page
    .getByRole("radiogroup", { name: "Versandarten" })
    .getByRole("radio", { name: method });
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/checkout/selection") &&
        r.request().method() === "POST",
    ),
    radio.check(),
  ]);
  await expect(radio).toBeChecked();
});

Then("{string} is chosen", async ({ page }, method: string) => {
  await expect(
    page
      .getByRole("radiogroup", { name: "Versandarten" })
      .getByRole("radio", { name: method }),
  ).toBeChecked();
});

Then("I am asked for my wished delivery time", async ({ page }) => {
  await expect(timeField(page)).toHaveAccessibleName("Wunschlieferzeit");
});

Then("I am asked for my wished pickup time", async ({ page }) => {
  await expect(timeField(page)).toHaveAccessibleName("Wunschabholzeit");
});

Then(
  "the earliest wished time is {int} minutes from now",
  async ({ page }, lead: number) => {
    await expect(async () => {
      const now = await restaurantNow(page);
      const { earliest } = await timeWindow(page);
      // the hint is computed a moment before; a minute either way
      expect(Math.abs(earliest - (now + lead))).toBeLessThanOrEqual(1);
    }).toPass({ timeout: 10_000 });
  },
);

async function enterGuestDetails(page: Page, world: World) {
  const details = page.getByRole("region", { name: /Ihre Angaben/ });
  for (const [label, value] of [
    ["Vorname", "Max"],
    ["Nachname", "Muster"],
    ["E-Mail", world.email],
    ["Straße und Hausnummer", "Musterstraße 1"],
    ["PLZ", "12345"],
    ["Ort", "Musterstadt"],
    ["Telefon", "0123456789"],
  ] as const) {
    await details
      .getByRole("textbox", { name: label, exact: true })
      .fill(value);
  }
  await details
    .getByRole("checkbox", { name: /Datenschutzerklärung gelesen/ })
    .check();
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/checkout/guest") &&
        r.request().method() === "POST",
    ),
    details.getByRole("button", { name: "Angaben speichern" }).click(),
  ]);
  await expect(details.getByText(world.email)).toBeVisible();
}

When("I enter my details as a guest", async ({ page, world }) => {
  await enterGuestDetails(page, world);
});

When(
  "I wish to get my order an hour after the earliest time",
  async ({ page }) => {
    const { earliest, until } = await timeWindow(page);
    let wished = Math.ceil((earliest + 60) / 5) * 5;
    // late in the day there is no hour left: the latest time it allows
    if (until !== undefined && wished > until)
      wished = Math.floor(until / 5) * 5;
    const field = timeField(page);
    await field.fill(hhmm(wished));
    await field.blur();
    await expect(field).toHaveValue(hhmm(wished));
  },
);

const orderButton = (page: Page) =>
  page.getByRole("button", {
    name: "Zahlungspflichtig bestellen",
    exact: true,
  });

When("I place the order", async ({ page, world }) => {
  world.wishedTime = await timeField(page).inputValue();
  const button = orderButton(page);
  await expect(button).toBeEnabled();
  await button.click();
});

Then("my order is confirmed", async ({ page }) => {
  await page.waitForURL(/\/bestellung\/[^/]+\/erfolg/);
  await waitForHydration(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Vielen Dank für Ihre Bestellung",
  );
});

Then("the confirmation shows my wished time", async ({ page, world }) => {
  expect(world.wishedTime).toMatch(/^\d\d:\d\d$/);
  await expect(
    definitionOf(page.getByRole("main"), "Wunschzeit"),
  ).toContainText(world.wishedTime!);
});

Then("the confirmation lists {string}", async ({ page }, label: string) => {
  await expect(
    page
      .getByRole("main")
      .getByRole("listitem")
      .filter({ hasText: new RegExp(`×\\s*${escape(label)}\\s*\\d`) }),
  ).toBeVisible();
});

Then("I am told the restaurant takes no orders right now", async ({ page }) => {
  await expect(
    page
      .getByRole("main")
      .getByText(
        "Es werden aktuell keine weiteren Bestellungen mehr aufgenommen",
      )
      .first(),
  ).toBeVisible();
});

Then("no order is placed", async ({ page }) => {
  await expect(page).toHaveURL(/\/bestellung\/kasse$/);
  await expect(
    page
      .getByRole("region", { name: "Ihre Bestellung" })
      .getByRole("heading", { level: 3 })
      .first(),
  ).toBeVisible();
});

Then("the restaurant shows it opens again tomorrow", async ({ page }) => {
  await expect(page.getByRole("banner").getByRole("status")).toHaveText(
    /^Öffnet morgen/,
  );
});

Then("I am told the restaurant is closed now", async ({ page }) => {
  await expect(
    page
      .getByRole("main")
      .getByText("Wir haben aktuell leider geschlossen")
      .first(),
  ).toBeVisible();
});

Then("I cannot place the order", async ({ page }) => {
  await expect(orderButton(page)).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "Ihre Bestellung" })
      .getByRole("button", { name: /geschlossen|keine weiteren Bestellungen/ }),
  ).toBeDisabled();
});
