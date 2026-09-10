# Issue #275: Lighthouse accessibility, contrast and `aria-hidden-focus`

As of 2026-09-10, branch `fix/275-accessibility-contrast-aria-hidden`.

## Findings (Lighthouse 12 on pizzeria-lafattoria.de, score 92 mobile and desktop)

The issue guessed at light backgrounds and a carousel; both audits point elsewhere.

- **color-contrast** happens in the **dark mode** (the shop's default): the brand green `#4d7c0f` (`brand-500`, the `--ui-primary` of both modes) on `#171717` is 3.59:1, both as `text-primary` (`data-slot="headline"`) and as dark `text-inverted` on solid primary buttons (hero, section and CTA links). In light mode `#4d7c0f` on white is 4.99:1 and passes.
- **aria-hidden-focus** is not a carousel: the two `span[aria-hidden="true"][tabindex="0"]` sit before and after the toast viewport (`<ol data-slot="viewport">`). They are Reka UI's toast `FocusProxy` (`VisuallyHidden` with feature `focusable`, which sets `aria-hidden="true"` on a tabbable span), rendered while a toast is open. The store-status toast "Wir haben geschlossen!" had `duration: 0`, so the proxies existed on every page for the whole session.

Contrast of the palettes in use (WCAG ratio, target ≥ 4.5; "tint" is the 10 % tint of the colour on white that subtle buttons and badges use):

| Palette | 500 on white | 600 on white / tint | 400 on #171717 | 500 on #171717 |
| --- | --- | --- | --- | --- |
| ShopBite orange (storefront default) | 3.11 | old `#e64d00` 3.87; new `#c23d00` 5.30 / 4.59 | 6.89 | 5.76 |
| La Fattoria green | 4.99 | 7.12 / 6.12 | 9.07 | 3.59 |
| Tailwind rose (hey-amore) | 3.67 | 4.70 / ~4.1 | 6.66 | 4.88 |
| Tailwind red (masala-mio) | 3.76 | 4.83 / ~4.2 | 6.48 | 4.76 |

So the storefront default and both demos fail in light mode as well; nobody had run Lighthouse there. Nuxt UI's `success` green (`green-500`, `#00c950`) on the diet badges is 2.22 on white.

## Decisions (agreed with Lirim)

- Contrast: Nuxt UI convention. `--ui-primary` is `brand-600` in light mode and `brand-400` in dark mode; the storefront's own `brand-600` becomes `#c23d00` (5.30 on white, 4.59 on its tint). `--ui-success` is `green-800` light / `green-400` dark. Rule for demos: `brand-600` ≥ 5:1 on white (covers the tint), `brand-400` ≥ 4.5:1 on `#171717`.
- Toast proxies: instead of patching `reka-ui` (tried first: a pnpm patch of `dist/Toast/FocusProxy.{js,cjs}` without `aria-hidden` cleared the audit), the **status toasts are gone**. A permanent "closed" toast was a misuse of a transient notification; the status is now a line above the opening hours in the footer (`components/Footer/StoreStatus.vue`, `useStoreStatus`). A chip next to the logo was tried first: on phones only the dot fit, on the desktop the text ran into the navigation, and inside the logo link it broke the link's accessible name. Transient toasts stay on Nuxt UI; their proxies only exist for seconds. Upstream issue for the proxy still worth filing.
- The status line is client only (`ClientOnly` with a placeholder of the same size): the open/closed state depends on the current time, and the server's clock/time zone is not the shop's. Server-rendered status would need a configured time zone; separate issue if wanted.
- La Fattoria keeps its own `main.css`; the same `--ui-primary` and `--ui-success` changes went there as veliu/pizzerialafattoria#346.

## Implementation

- `app/assets/css/main.css`: `--ui-primary` and `--ui-success` per mode, orange `brand-600` = `#c23d00`, `brand-700` = `#a83500`.
- `Product/Card.vue` and `Wishlist.vue` used `text-brand-500` / `text-primary-600` for product numbers and prices; they now use `text-primary`, so they follow the mode-aware token.
- `useStoreStatus`: open → closing time of the current interval; closed → `getNextOpeningTime`. Refreshes the clock every minute. `app.vue` keeps loading business hours and holidays on mount but no longer shows toasts.
- `Footer/StoreStatus.vue`: "Geöffnet bis 23:00 Uhr" or "Geschlossen, wir öffnen wieder …", no link (the old toast's "Zur Speisekarte" action was dropped on purpose). `role="status"`, placeholder of the same height while unknown.
- `--ui-text-muted` in light mode is `#6b6b6b` (was `#737373`, 4.38:1 on `--ui-bg-elevated`, the header navigation background). `UHeader` gets `:title="site.name"`: Nuxt UI's default made the logo link read "Nuxt UI".
- Docs: contrast rule in `homepage/content/{de,en}/docs/8.storefront/2.configuration.md` and the demo-shop checklist in the root `CLAUDE.md`.

## Not covered

- `error`, `warning` and `info` keep Nuxt UI's 500 step in light mode (`red-500` on white is 3.81); form validation text would need the same treatment.
- The demos `hey-amore` and `masala-mio` map `brand-600` to `rose-600`/`red-600` (4.70/4.83 on white, below 5:1 on the tint). Their scales should move `brand-600` to the 700 step of their Tailwind colour.

## Verification

See the PR description.
