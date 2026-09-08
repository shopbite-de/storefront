# Issue #276 — `payment-method-blocked` is not handled headlessly

Date: 2026-09-08 · Branch: `fix/issue-276-payment-method-blocked` · PR #280
(builds on #278, merged the same day)

## Background

Same mechanism as #240, see
`2026-09-08-issue-240-shipping-method-blocked.md`. Shopware's
`BlockedPaymentMethodSwitcher` only runs inside the Twig storefront
(`StorefrontCartFacade`). Via the Store API a payment method whose
availability rule stops matching leaves a `payment-method-blocked` cart
error (`PaymentMethodBlockedError`, `blockOrder() = true`) and
`POST /checkout/order` fails with `CHECKOUT__CART_INVALID`.

## Fix

`useShippingMethodGuard` was generalised into
`app/composables/useCheckoutMethodGuard.ts`:

- One internal `resolve(config)` handles both method types. The config
  describes how to detect the blocked state, load the available methods
  (`forceReload`), pick the sales-channel default
  (`salesChannel.shippingMethodId` / `salesChannel.paymentMethodId`) and
  select the replacement.
- Public API: `ensureAvailableShippingMethod()`,
  `ensureAvailablePaymentMethod()` and `ensureAvailableCheckoutMethods()`.
  The combined variant refreshes the cart once and resolves shipping
  before payment, because payment availability rules may depend on the
  shipping method. Exposes `isShippingMethodBlocked`,
  `isPaymentMethodBlocked` and `isResolving`.
- `Checkout/Summary.vue` and `Checkout/PaymentAndDelivery.vue` use the
  combined variant. The summary button label and the "nothing available"
  toast name the affected method type ("Versandart" / "Zahlart").
- The payment radio on the "Zahlung & Versand" step is kept in sync with
  the session like the shipping radio.

Tests: `test/nuxt/useCheckoutMethodGuard.test.ts` (replaces the shipping
guard test) and `test/nuxt/PaymentAndDelivery.test.ts`.
