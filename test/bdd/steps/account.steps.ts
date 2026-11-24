import { expect, type Browser, type Page } from "@playwright/test";
import { Given, Then, When, type World } from "./fixtures";
import { gotoHydrated, logIn, waitForHydration } from "../support/storefront";

/** Fills the registration form (page /registrierung) and sends it. */
async function register(page: Page, world: World) {
  await gotoHydrated(page, "/registrierung");
  const form = page.getByRole("main");
  for (const [label, value] of [
    ["Vorname", "Erika"],
    ["Nachname", "Muster"],
    ["E-Mail", world.email],
    ["Passwort", world.password],
    ["Passwort wiederholen", world.password],
    ["Straße und Hausnummer", "Musterstraße 1"],
    ["PLZ", "12345"],
    ["Ort", "Musterstadt"],
    ["Telefon", "0123456789"],
  ] as const) {
    await form.getByRole("textbox", { name: label, exact: true }).fill(value);
  }
  await form
    .getByRole("checkbox", { name: /Datenschutzerklärung gelesen/ })
    .check();
  await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes("/api/account/register") &&
        r.request().method() === "POST",
    ),
    form.getByRole("button", { name: "Angaben speichern" }).click(),
  ]);
}

async function logOut(page: Page) {
  await gotoHydrated(page, "/konto");
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/account/logout")),
    page
      .getByRole("main")
      .getByRole("button", { name: "Abmelden", exact: true })
      .click(),
  ]);
}

/** An account made in a browser of its own, so this visitor stays a guest. */
async function accountFor(
  browser: Browser,
  world: World,
  baseURL: string | undefined,
) {
  const context = await browser.newContext({ baseURL });
  try {
    const page = await context.newPage();
    await register(page, world);
    await expectLoggedIn(page);
  } finally {
    await context.close();
  }
}

async function expectLoggedIn(page: Page) {
  await gotoHydrated(page, "/");
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Mein Konto" }),
  ).toBeVisible();
}

Given("I have an account", async ({ browser, world, baseURL }) => {
  await accountFor(browser, world, baseURL);
});

Given(
  "I am a logged-in customer",
  async ({ browser, page, world, baseURL }) => {
    await accountFor(browser, world, baseURL);
    await logIn(page, world.email, world.password);
    await expectLoggedIn(page);
  },
);

When("I register an account", async ({ page, world }) => {
  await register(page, world);
});

When("I log in", async ({ page, world }) => {
  await logIn(page, world.email, world.password);
});

When("I log in with a wrong password", async ({ page, world }) => {
  await logIn(page, world.email, `${world.password}-wrong`);
});

When("I log out", async ({ page }) => {
  await logOut(page);
});

When("I log out and log in again", async ({ page, world }) => {
  await logOut(page);
  await logIn(page, world.email, world.password);
  await expectLoggedIn(page);
});

Then("I am logged in", async ({ page }) => {
  await expectLoggedIn(page);
});

Then("I am logged out", async ({ page }) => {
  await gotoHydrated(page, "/");
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Anmelden" }),
  ).toBeVisible();
});

Then("I am told the e-mail or password is wrong", async ({ page }) => {
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Bitte überprüfen Sie Ihre Zugangsdaten." }),
  ).toBeVisible();
});

When("I ask for a new password", async ({ page, world }) => {
  await gotoHydrated(page, "/anmelden");
  await page.getByRole("link", { name: "Passwort vergessen?" }).click();
  await page.waitForURL(/\/passwort-vergessen$/);
  await waitForHydration(page);
  await page
    .getByRole("main")
    .getByRole("textbox", { name: "E-Mail", exact: true })
    .fill(world.email);
  await Promise.all([
    page.waitForResponse((r) =>
      r.url().includes("/api/account/password-reset"),
    ),
    page.getByRole("button", { name: "Link senden" }).click(),
  ]);
});

Then("I am told an e-mail is on its way", async ({ page }) => {
  await expect(
    page.getByRole("main").getByText("E-Mail ist unterwegs"),
  ).toBeVisible();
});

Then(
  "I receive an e-mail with a link to set a new password",
  async ({ backend, world }) => {
    const mails = await backend.mailsTo(world.email);
    const link = mails
      .flatMap((mail) => mail.links)
      .find((url) => url.includes("/account/recover/password"));
    expect(link, `a reset link in the mails to ${world.email}`).toBeTruthy();
    world.mailLinks = [link!];
  },
);

When(
  "I set a new password through that link",
  async ({ page, world, baseURL }) => {
    // the link names the shop's domain; this storefront may run elsewhere
    const link = new URL(world.mailLinks![0]!);
    await gotoHydrated(
      page,
      new URL(link.pathname + link.search, baseURL).toString(),
    );
    world.password = `${world.password}-new`;
    const form = page.getByRole("main");
    await form
      .getByRole("textbox", { name: "Neues Passwort", exact: true })
      .fill(world.password);
    await form
      .getByRole("textbox", { name: "Neues Passwort wiederholen", exact: true })
      .fill(world.password);
    await form.getByRole("button", { name: "Passwort speichern" }).click();
    await expect(form.getByText("Ihr Passwort ist geändert.")).toBeVisible();
  },
);

Then("I can log in with the new password", async ({ page, world }) => {
  await logIn(page, world.email, world.password);
  await expectLoggedIn(page);
});
