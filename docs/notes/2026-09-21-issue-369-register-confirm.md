# Issue #369: registration confirmation reported success on failure

## Finding

`app/pages/registrierung/bestaetigen.vue` swallowed every error of
`registerConfirm post /account/register-confirm` and then always showed the
success toast and navigated to `/konto`.

Even the success path was broken: Shopware's `RegisterConfirmRoute::confirm()`
logs the customer in (it replaces the context token and returns it in the
`sw-context-token` header), but the page never reloaded the session context.
`useUser().isLoggedIn` stayed `false`, so the `account` layout sent the visitor
on to `/anmelden`.

Error codes (checked against `shopware.shopbite.de` and the Shopware 6.7 source, 2026-09-21):

| Case                     | Status | Code                                      |
| ------------------------ | ------ | ----------------------------------------- |
| unknown hash             | 404    | `CHECKOUT__CUSTOMER_NOT_FOUND_BY_HASH`    |
| no hash                  | 404    | `CHECKOUT__NO_HASH_PROVIDED`              |
| link already used        | 404    | `CHECKOUT__CUSTOMER_IS_ALREADY_CONFIRMED` |
| `em` does not match mail | 400    | validation error                          |

## Fix

- Missing `em`/`hash` query parameters: no API call, error shown.
- Success: `refreshSessionContext()` + `refreshCart()` (like `useUser().login`),
  merge the wishlist, toast, `/konto`.
- Already confirmed: info alert with a link to `/anmelden`.
- Any other failure: error alert with links to `/anmelden` and `/kontakt`.
  Shopware has no Store API route to resend the double opt-in mail, so the page
  cannot offer that.

The route stays client-side rendered (`routeRules`), so the confirmation runs
once in the browser; `useAsyncData` is no longer needed.
