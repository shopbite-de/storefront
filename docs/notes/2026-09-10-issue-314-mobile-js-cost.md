# Issue #314: Mobile JavaScript cost

As of 2026-09-10, branch `fix/314-mobile-js-cost`.

## Measurement setup

Production build, La Fattoria Store API, Lighthouse 12.8.2 mobile
(simulated throttling, 4× CPU) behind the h2/gzip proxy from
`docs/notes/2026-09-10-issue-273-performance-media.md`; two runs per page,
same machine. Chunk attribution comes from the client manifest that Nuxt
inlines into `.output/server/chunks/virtual/precomputed.mjs` (the preload
set of the entry is what the head lists as `modulepreload`).

## Findings on the baseline (main)

- The entry preloads 102 scripts (302 KB gzipped); 54 of them are below
  1 KB (reka-ui and Nuxt UI internals shared by several pages).
- `SalesChannelSwitch` was rendered on every page although the feature is
  off by default: it pulled `USelectMenu` (Combobox virtualizer, 25 KB
  gzipped) into the entry and fired a `/shopbite/multi-channel-group`
  request per page.
- `useMatomo` (the @nuxt/scripts registry composable, 10 KB gzipped) sat in
  the entry through `useTrackEvent`, also for shops without Matomo.
- `Header.vue` rendered a login `USlideover` that nothing opened.
- `NuxtLink` prefetched the chunks of every link in view: ~20 chunks and a
  page stylesheet (72 KB) during the initial load of the home page.
- On the category page the cart drawer, the mobile filter drawer (both
  vaul) and one `UCollapsible` per card were mounted with the page; the
  drawer chunk and the collapsible chunk each cost ~400 ms of scripting
  (mostly forced layout on a 1,200-element page).
- Client-side navigation to a content page (`/agb`) or back to `/` loads
  the SQLite WASM build (865 KB) plus the collection dump, because
  `queryCollection()` in the browser prefers WASM whenever
  `window.WebAssembly` exists.
- `Style & Layout` (~1.1 s on the home page, 313 DOM elements) is the
  first render of the 253 KB stylesheet; not JavaScript, not part of this
  issue.
- Sentry ships no client code (no `sentry.client.config.ts`).

## Changes

1. `LazySalesChannelSwitch v-if="multiChannel"` in `Header.vue` and
   `Header/Body.vue`; the dead login slideover is removed.
2. `plugins/matomo.ts` imports `useMatomo` after `onNuxtReady`;
   `useTrackEvent` pushes to Matomo's `_paq` queue directly (matomo.js
   replays it), gated by the new `useMatomoConfig()`.
3. `hydrateWhenVisible()` (`app/utils`): keeps the server-rendered markup of
   a component and hydrates it when it comes within 600 px of the viewport,
   without turning it into a separate chunk. Used for the product cards in
   `Category/Listing.vue` and `pages/suche.vue` and for the footer in
   `app.vue`. The margin exceeds the reveal margin of `AnimatedSection`
   (100 px), so the scroll animation still runs.
4. Cart drawer (`Header/Right.vue`), mobile filter drawer
   (`Category/Listing.vue`) and the product options collapsible
   (`Product/CardFooter.vue`) are created on first use (`v-if` + `nextTick`
   before opening); the `ClientOnly` wrappers they needed are gone.
5. `experimental.defaults.nuxtLink.prefetchOn = { visibility: false,
   interaction: true }`: route chunks load on hover/touch.
6. `server/api/content/home.get.ts` and `page.get.ts` run the content
   queries on the server (`@nuxt/content/server`); `pages/index.vue` and
   `pages/[...all].vue` fetch them.
7. Rolldown `codeSplitting.groups` (`nuxt.config.ts`, `vite.build`):
   framework and UI modules shared by at least two chunks form two chunks
   instead of ~60 tiny ones.

## Results (Lighthouse mobile, two runs each)

| Page | Metric | Baseline | After |
| --- | --- | --- | --- |
| `/` | TBT | 330–400 ms | 150–170 ms |
| `/` | Script evaluation | 705–811 ms | 600–630 ms |
| `/` | Script requests (transfer) | 135 (394 KB) | 34–35 (335 KB) |
| `/` | Main thread | 2.5–2.6 s | 2.1–2.2 s |
| `/c/Pizza/` | TBT | 570–590 ms | 300–340 ms |
| `/c/Pizza/` | Script evaluation | 1.5–1.6 s | 1.1–1.2 s |
| `/c/Pizza/` | Script requests (transfer) | 133 (394 KB) | 35 (321 KB) |
| `/c/Pizza/` | Main thread | 4.0 s | 2.9–3.1 s |

Three runs of the final build (two of the chunk-group step, one of the
final commit); the category numbers are for the 29-product "Pizza"
category, the 100-product case scales with the same mechanism (cards
hydrate on scroll).

Intermediate steps: changes 1–3 brought the home page to TBT 280–290 ms
/ 650–680 ms script evaluation and the category page to 420–440 ms /
1.25–1.3 s; changes 4–5 to 190–260 ms / 570–600 ms and 390–480 ms /
1.14–1.2 s; the chunk groups (7) cut the requests from 116 to 34 and
took TBT to 170 ms / 340 ms. The entry's preload set went from 102
scripts (302 KB gzipped) to 25 (301 KB): the shared `ui` chunk carries
UI code that not every page needs, but the bytes are the same and the
module overhead is gone.

FCP (3.0–3.3 s) and LCP are unchanged: they are the local headless
first-paint artefact described in the #273 note and the stylesheet
(`Style & Layout` ~1 s on 311 DOM elements), not JavaScript.

## Not done

- `Style & Layout` ~1 s on every page comes from the 253 KB Tailwind /
  Nuxt UI stylesheet; a CSS topic of its own.
- `UHeader` imports `UModal`, `UDrawer` and `USlideover` statically
  (Nuxt UI), so vaul stays in the entry even though the drawers are
  created on demand.
- The wishlist button on the product card has only a tooltip, no
  `aria-label` (noticed while writing the checks).
- `nuxt-vitalizer`'s `disablePreloadLinks` was not tried: with 25
  preloads left, the trade (a later start per chunk) has little to gain.

## Verification

- Playwright (mobile viewport): first and middle product card open their
  options after scrolling, the wishlist button of the last card updates the
  header count, the filter drawer and the cart drawer open, the footer's
  colour mode button works, no console errors; client-side navigation to
  `/agb` and back to `/` no longer requests the WASM build or a SQL dump.
- Matomo with `NUXT_PUBLIC_SCRIPTS_MATOMO_ANALYTICS_*` set: the registry
  chunk loads after `onNuxtReady`, `matomo.js` is requested and `_paq`
  holds the page view.
- Unit tests, Prettier, ESLint, typecheck and build pass.
