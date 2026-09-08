# Issue #240 — `shipping-method-blocked` invalidates the cart and blocks orders

Date: 2026-09-08 · Branch: `fix/issue-240-shipping-method-blocked`

## Symptom

OpenObserve RUM reported 39 occurrences in 7 days of

> Failed request
> - [Internal Server Error] The cart is invalid, got 1 error(s): shipping-method-blocked…

raised by `POST /store-api/checkout/order`. The customer clicks
"Jetzt bestellen!", the button briefly spins, and nothing happens.

## Root cause

Two things combine:

1. **Shopware only auto-switches a blocked shipping method in its Twig
   storefront.** `Shopware\Storefront\Checkout\Shipping\BlockedShippingMethodSwitcher`
   is wired into `StorefrontCartFacade`, which the Store API never uses.
   Via the Store API the cart simply carries a `shipping-method-blocked`
   error (`ShippingMethodBlockedError`, level *warning*, `blockOrder() = true`)
   and `OrderPersister::persist()` throws `CartException::invalidCart()`
   (HTTP 500, `CHECKOUT__CART_INVALID`). Verified against
   `shopware/core` v6.7.13.1 in `../shopware/vendor`.

   A shipping method becomes blocked whenever its availability rule no
   longer matches the current context (`DeliveryValidator`) or it is not
   in the "onlyAvailable" list (`CheckoutGatewayRoute`). Typical triggers
   in a food-delivery shop: cart total falls below the minimum order value
   of the delivery rule, the customer switches to an address outside the
   delivery zone, or the rule depends on time/day.

2. **The headless storefront never looked at cart errors and never caught
   the failed order request.** `CheckoutSummary.handleCreateOrder()` had
   only `try … finally`, so the rejection escaped as an unhandled error
   (which is what RUM captured) and the customer saw no feedback. The
   "Jetzt bestellen!" button only checked that *some* shipping method was
   set in the session, not that it was still allowed.

## Fix

- New composable `app/composables/useShippingMethodGuard.ts`:
  - `hasBlockedShippingMethod(cart)` / `getCartErrors(cart)` normalise
    `cart.errors` (array or keyed object) and look for
    `messageKey === "shipping-method-blocked"`.
  - `ensureAvailableShippingMethod()` refreshes the cart and, if blocked,
    reloads the available shipping methods (`forceReload`), picks the
    sales-channel default (`sessionContext.salesChannel.shippingMethodId`)
    or otherwise the first available method, sets it, refreshes the cart
    again and shows a warning toast. Returns `false` when no alternative
    exists or the cart is still blocked. This mirrors Shopware's own
    `BlockedShippingMethodSwitcher` behaviour.
- `Checkout/PaymentAndDelivery.vue` runs the guard after loading the
  methods, keeps the radio in sync with the session's shipping method and
  no longer re-sets a method that is already selected.
- `Checkout/Summary.vue` runs the guard on mount and again right before
  `createOrder()`. If no shipping method is available the order button is
  disabled with "Aktuell ist keine Versandart verfügbar". `createOrder`
  failures are now caught, logged and surfaced as an error toast, and the
  cart is refreshed.

Tests: `test/nuxt/useShippingMethodGuard.test.ts` (new) and
`test/nuxt/PaymentAndDelivery.test.ts` (extended).

## Not covered / follow-ups

- The same gap exists for `payment-method-blocked`
  (`BlockedPaymentMethodSwitcher` is Twig-storefront only as well).
  Filed as #276 and fixed in #280, which generalised the composable into
  `app/composables/useCheckoutMethodGuard.ts`. `useShippingMethodGuard`
  described above no longer exists; see
  `2026-09-08-issue-276-payment-method-blocked.md` for the current API.
- The *reason* a shipping method gets blocked lives in the Shopware admin
  rule configuration of each shop and cannot be determined from this
  repository. If the RUM count does not drop after this fix, check the
  availability rules of the delivery shipping method for the affected
  sales channel.
- `pnpm typecheck` reports 37 pre-existing errors on `main` (30 inside
  `@shopware/composables` / `@shopware/nuxt-module`, 7 in our test files).
  Unrelated to this change; filed as #277. #276 covers the
  `payment-method-blocked` gap.
