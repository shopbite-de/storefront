import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.context().clearCookies();
});

test("Simple Checkout As Recurring Customer", async ({ page }) => {
  const QUANTITY_TO_ADD = 4;
  const PRODUCT_ID = "019a4baa4267700b911411eca842ee17";

  await clearCart(page);
  await navigateToCategoryAndVerifyProducts(page);
  await selectProductAndAddToCart(page, PRODUCT_ID, QUANTITY_TO_ADD);
  await proceedToCheckoutAndLogin(page);
  await verifyCheckoutQuantity(page);
  await selectPaymentAndShipping(page);
  await proceedToOrderReview(page);
  await page.goto("/");
  await clearCart(page);
});

// Helper Functions

async function clearCart(page: Page) {
  const cartButton = page
    .locator("button .i-lucide\\:shopping-cart")
    .locator("..");

  await expect(cartButton).toBeVisible({ timeout: 5000 });
  await cartButton.click();

  const cartDrawer = page.locator('[data-vaul-drawer][data-state="open"]');
  await expect(cartDrawer).toBeVisible({ timeout: 5000 });
  await expect(page.getByRole("heading", { name: /warenkorb/i })).toBeVisible();

  const deleteButtons = page.getByRole("button", {
    name: "Remove item from cart",
  });
  const itemCount = await deleteButtons.count();

  for (let i = itemCount - 1; i >= 0; i--) {
    await deleteButtons.nth(i).click();
    await page.waitForTimeout(500);
  }
}

async function navigateToCategoryAndVerifyProducts(page: Page) {
  await page.goto("/c/Pizza", { waitUntil: "load" });
  await expect(page.locator("h1")).toHaveText("Pizza");

  const productCards = page.locator('[id^="product-card-"]');
  await expect(productCards).toHaveCount(5, { timeout: 10000 });
}

async function selectProductAndAddToCart(
  page: Page,
  productId: string,
  quantity: number,
) {
  const productCard = page.locator(`#product-card-${productId}`);
  await expect(productCard).toBeVisible();

  // Verify product card structure
  const buttons = productCard.locator("button");
  await expect(buttons).toHaveCount(2);
  await expect(productCard.locator("button .i-lucide\\:heart")).toBeVisible();

  // Open product details
  const showDetailsButton = productCard.locator(
    "button .i-lucide\\:shopping-cart",
  );
  await expect(showDetailsButton).toBeVisible();
  await showDetailsButton.click();

  // Set quantity and add to cart
  const quantityInput = page.getByRole("spinbutton", { name: /anzahl/i });
  await expect(quantityInput).toBeVisible();
  await quantityInput.fill(quantity.toString());
  await expect(quantityInput).toHaveValue(quantity.toString());

  const addToCartButton = page.getByRole("button", {
    name: "In den Warenkorb",
  });
  await expect(addToCartButton).toBeVisible({ timeout: 10000 });
  await addToCartButton.click();
  await expect(addToCartButton).not.toBeVisible({ timeout: 5000 });
}

async function proceedToCheckoutAndLogin(page: Page) {
  await page.goto("/bestellung", { waitUntil: "load" });

  const loginTab = page.getByRole("tab", { name: "Einloggen" });
  await expect(loginTab).toBeVisible();
  await loginTab.click();

  // Fill login form
  const loginEmailInput = page.getByPlaceholder("Email-Adresse eingeben");
  const loginPasswordInput = page.getByPlaceholder("Passwort eingeben");
  const loginButton = page.getByRole("button", { name: "Anmelden" });

  await expect(loginEmailInput).toBeVisible();
  await expect(loginPasswordInput).toBeVisible();
  await expect(loginButton).toBeVisible();

  await loginEmailInput.fill(process.env.TEST_USER!);
  await loginPasswordInput.fill(process.env.TEST_USER_PASS!);
  await loginButton.click();
}

async function verifyCheckoutQuantity(page: Page) {
  const checkoutQuantityInput = page.getByRole("spinbutton", {
    name: /item quantity/i,
  });
  await expect(checkoutQuantityInput).toBeVisible();
  // Quantity verification can be added here if needed
}

async function selectPaymentAndShipping(page: Page) {
  const nextStepButton = page.getByRole("button", {
    name: "Zahlungs- und Versandart auswählen",
  });
  await expect(nextStepButton).toBeVisible({ timeout: 10000 });
  await expect(nextStepButton).toBeEnabled();
  await nextStepButton.click();

  // Verify payment method
  const paymentRadio = page.getByRole("radio", { name: "Cash on delivery" });
  await expect(paymentRadio).toBeVisible();
  await expect(paymentRadio).toBeChecked();

  // Verify delivery method
  const deliveryRadio = page.getByRole("radio", { name: "Standard" });
  await expect(deliveryRadio).toBeVisible();
  await expect(deliveryRadio).toBeChecked();
}

async function proceedToOrderReview(page: Page) {
  const lastStepButton = page.getByRole("button", {
    name: "Weiter zu Prüfen & Bestellen",
  });
  await expect(lastStepButton).toBeVisible({ timeout: 10000 });
  await expect(lastStepButton).toBeEnabled();
  await lastStepButton.click();
}
