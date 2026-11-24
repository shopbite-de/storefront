import { expect } from "@playwright/test";
import { Then, When } from "./fixtures";
import { cartLine, definitionOf, openCart } from "../support/storefront";

Then(
  "my cart holds {int} {string}",
  async ({ page }, quantity: number, label: string) => {
    const cart = await openCart(page);
    await expect(cart.getByRole("heading", { level: 3 })).toHaveText([label]);
    await expect(cartLine(cart, label).getByRole("status")).toHaveText(
      String(quantity),
    );
  },
);

Then("my cart total is {string}", async ({ page }, total: string) => {
  const cart = await openCart(page);
  await expect(await definitionOf(cart, "Gesamt")).toHaveText(total);
});

When("I add one more {string} in my cart", async ({ page }, label: string) => {
  const cart = await openCart(page);
  await Promise.all([
    page.waitForResponse(
      (r) =>
        /\/api\/cart\/lines\//.test(r.url()) &&
        r.request().method() === "PATCH",
    ),
    cartLine(cart, label)
      .getByRole("button", { name: `${label}, eine mehr` })
      .click(),
  ]);
});

When("I remove {string} from my cart", async ({ page }, label: string) => {
  const cart = await openCart(page);
  await Promise.all([
    page.waitForResponse(
      (r) =>
        /\/api\/cart\/lines\//.test(r.url()) &&
        r.request().method() === "DELETE",
    ),
    cartLine(cart, label)
      .getByRole("button", { name: `${label} entfernen` })
      .click(),
  ]);
});

Then("my cart is empty", async ({ page }) => {
  const cart = await openCart(page);
  await expect(
    cart.getByText(/Der Warenkorb ist (noch )?leer\./),
  ).toBeVisible();
  await expect(cart.getByRole("heading", { level: 3 })).toHaveCount(0);
});
