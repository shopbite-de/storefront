# Checkout steps: hydration mismatches on direct load

Date: 2026-09-16. Branch `fix/339-checkout-stepper-step`, issue #339.

## Reproduced

Production build against the demo backend, guest session with one cart item
created through the Store API, `sw-context-token` cookie set in Playwright,
each step loaded directly:

| Step                          | Before                           | After                  |
| ----------------------------- | -------------------------------- | ---------------------- |
| `/bestellung/warenkorb`       | no warning, "Warenkorb" active   | unchanged              |
| `/bestellung/zahlung-versand` | mismatch, "Warenkorb" active     | no warning, step 2     |
| `/bestellung/bestaetigen`     | mismatch, "Warenkorb" active     | no warning, step 3     |

## Two causes, one pattern

Both mismatches came from a child component changing state of its parent
during its setup. With SSR the parent's markup rendered before that change
reached it (or, in the second case, after it), while the browser hydrated with
the other value. Vue does not patch attributes and classes in production.

1. **Stepper** (the cause suspected in the issue): the step pages called
   `setStep(n)` of the Pinia checkout store in their setup, after
   `bestellung.vue` had rendered `<UStepper>` with step 0. The serialized store
   state carried the new step, so the browser hydrated with step n.
   Fix: `bestellung.vue` derives the step from `route.path` (index in
   `stepRoutes`); its setter navigates. The store and `useCheckoutStore` had no
   other users (also none in `demos/` and `masala-mio/`) and are removed.
   Pinia is still registered as a module but has no store now.
2. **Order button on `/bestellung/bestaetigen`**, found only after fixing the
   stepper (the dev server prints the mismatching node):
   `Checkout/DeliveryTimeSelect.vue` emits `update:valid` from an immediate
   watch. No time is selected before the business hours load in the browser
   (`app.vue` on mount), so it always emits `false` first. On the server the
   button renders after that emit ("Wir haben aktuell leider geschlossen",
   lock icon, disabled); `Summary.vue` started with `isValidTime = ref(true)`,
   so the browser hydrated "Jetzt bestellen!". Fix: start with `false`.

## Verified

- Production build: no hydration warning on any step, correct active step.
- Client-side navigation: stepper click back to "Zahlung & Versand" and
  "Warenkorb", "Weiter zu Prüfen & Bestellen" button forward.
- After the business hours load the order button reads "Jetzt bestellen!" and
  is enabled (demo shop open).
- `pnpm typecheck` (0 errors), `pnpm prettier`, `pnpm eslint`,
  `pnpm test:unit` without the Matomo variables (264 tests).
