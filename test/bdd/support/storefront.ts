/**
 * How the steps use the storefront: by roles, labels and the German texts
 * a guest reads, never by CSS classes.
 */
import {
  expect,
  type Locator,
  type Page,
  type Response,
} from "@playwright/test";

/** Opens a path and waits until Nuxt has hydrated it. */
export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await waitForHydration(page);
}

export async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () =>
      (
        window as unknown as { useNuxtApp?: () => { isHydrating?: boolean } }
      ).useNuxtApp?.().isHydrating === false,
  );
  await page.waitForLoadState("networkidle");
}

/** The answer to a cart write (the first one sets the session cookie). */
export function cartWritten(page: Page): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      /\/api\/cart\/lines/.test(response.url()) &&
      response.request().method() !== "GET",
  );
}

/** Opens a menu section through the menu's own navigation. */
export async function openSection(page: Page, name: string) {
  await openMenu(page);
  await page
    .getByRole("navigation", { name: "Kategorien" })
    .getByRole("link", { name, exact: true })
    .click();
  await expect(
    page.getByRole("heading", { level: 1, name: new RegExp(`^${name}\\b`) }),
  ).toBeVisible();
  await waitForHydration(page);
}

export async function openMenu(page: Page) {
  await gotoHydrated(page, "/");
  await page
    .getByRole("navigation", { name: "Hauptnavigation" })
    .getByRole("link", { name: "Speisekarte", exact: true })
    .click();
  await page.waitForURL(/\/speisekarte\/$/i);
  await waitForHydration(page);
}

/** The bon card of a dish on a menu page. */
export function dishCard(page: Page, name: string): Locator {
  return page.getByRole("article").filter({
    has: page.getByRole("heading", {
      level: 3,
      name: new RegExp(`${escape(name)}$`),
    }),
  });
}

export const escape = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Opens the dish sheet of a dish from the whole menu. */
export async function openDish(page: Page, name: string): Promise<Locator> {
  await openMenu(page);
  const card = dishCard(page, name);
  await card.getByRole("link").click();
  const sheet = page.getByRole("dialog", {
    name: new RegExp(`${escape(name)}$`),
  });
  await expect(sheet).toBeVisible();
  await waitForHydration(page);
  return sheet;
}

/** Puts the dish of an open sheet into the cart. */
export async function addFromSheet(page: Page, sheet: Locator) {
  await Promise.all([
    cartWritten(page),
    sheet.getByRole("button", { name: /^In den Warenkorb/ }).click(),
  ]);
  await expect(sheet).toBeHidden();
}

/** The cart as the header's cart sheet shows it. */
export async function openCart(page: Page): Promise<Locator> {
  const sheet = page.getByRole("dialog", { name: "Ihre Bestellung" });
  if (await sheet.isVisible()) return sheet;
  await page
    .getByRole("banner")
    .getByRole("button", { name: /^Warenkorb, / })
    .click();
  await expect(sheet).toBeVisible();
  return sheet;
}

/** The quantity stepper of a cart line, by the line's label. */
export function cartLine(cart: Locator, label: string): Locator {
  return cart.getByRole("group", { name: `Menge ${label}`, exact: true });
}

/** The value next to a term of a list (`<dt>`/`<dd>`), e.g. "Gesamt". */
export function definitionOf(scope: Locator, term: string): Locator {
  return scope
    .getByRole("term")
    .filter({ hasText: new RegExp(`^${escape(term)}$`) })
    .locator("xpath=following-sibling::*[1]");
}

/** Logs in on the login page. */
export async function logIn(page: Page, email: string, password: string) {
  await gotoHydrated(page, "/anmelden");
  const form = page.getByRole("main");
  await form.getByRole("textbox", { name: "E-Mail", exact: true }).fill(email);
  await form
    .getByRole("textbox", { name: "Passwort", exact: true })
    .fill(password);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/account/login")),
    form.getByRole("button", { name: "Anmelden", exact: true }).click(),
  ]);
}
