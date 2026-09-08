# Issue #241 — cart writes collide (`CHECKOUT__CART_LOCKED`)

Date: 2026-09-08 · Branch: `fix/issue-241-cart-mutation-queue`

## Re-verified against OpenObserve (last 7 days)

| Signature from the issue                      | In the issue | Now |
| --------------------------------------------- | ------------ | --- |
| PATCH line-item "Failed to fetch"             | 40           | 0   |
| POST line-item/delete "Failed to fetch"       | 18           | 0   |
| Cart "locked due to concurrent write" (409)   | 12           | 15  |

The mutation timeouts are gone. The remaining "<no response>" errors are
GET requests (`/store-api/seo-url` ×39, `/store-api/checkout/cart` ×10),
mostly marked *handled*, clustered in 8 sessions on 3 days — consistent
with navigations aborting in-flight requests, not with a backend outage.
Only the lock conflicts are still real: 15 errors in 8 sessions, all
unhandled; one session hit 5 within a minute, two in the same second.

## Root cause

Every cart write went straight to the Store API with no coordination:

- `Cart/Item.vue` called `changeProductQuantity` from a computed setter on
  every `+`/`-` click. Two quick clicks = two concurrent PATCH requests;
  Shopware rejects the second with `CHECKOUT__CART_LOCKED` (409). The
  input also displayed the *cart* quantity, so a click during an
  in-flight request counted from the stale value.
- `removeItem` / `addProducts` were fired without `await`, without
  error handling and without disabling the control.
- `useAddToCart` set `isLoading` but had no `try/finally`: after a
  failure the button stayed disabled and nothing was shown.

## Fix

`app/composables/useCartMutations.ts` — one module-level queue for all
cart writes (shared by every component instance):

- `setQuantity(id, qty)`: coalesces calls for the same line item — while
  one request is in flight at most one follow-up is queued and it sends
  the latest value; a value equal to the cart's current quantity sends
  nothing.
- `removeLineItem(item)`, `addLineItems(items)`: serialized writes.
- A 409 lock conflict (other tab, SSR overlap) is retried once after
  400 ms. A final failure logs, shows an error toast ("Bitte versuche es
  erneut."), re-reads the cart to re-sync the UI and resolves
  `undefined` so callers skip their success path.
- `isMutating` for disabling destructive controls.

Call sites: `Cart/Item.vue` (optimistic local quantity, delete disabled
while mutating), `useAddToCart` (`try/finally`, no success toast/tracking
on failure), `Food/MarqueeItem.vue`.

Tests: `test/nuxt/useCartMutations.test.ts`, `test/nuxt/CartItem.test.ts`,
extended `test/nuxt/useAddToCart.test.ts`.

## Left out on purpose

- Retry-with-backoff for "Failed to fetch" on mutations: no longer
  occurring in telemetry.
- Backend availability check: nothing in the current data points at it.
- Voucher removal (`useVoucherCode` → `removeItem`) still bypasses the
  queue; it is a rare, single click on the summary page.
