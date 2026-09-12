# Issue #319: Stylesheet cost and Style & Layout time on mobile

As of 2026-09-12, branch `fix/319-stylesheet-cost`.

## Measurement setup

Production build, La Fattoria Store API, Lighthouse 12.8.2 mobile
(simulated throttling, 4× CPU) behind the h2/gzip proxy of the #273 and
#314 notes, two runs per page. In addition, Chrome DevTools Protocol
traces through Playwright (4× CPU throttling, mobile viewport):
`Performance.getMetrics`, the `SelectorStats` trace category for selector
matching cost, and the invalidation-tracking category for the reasons of
each style recalculation and layout. To isolate causes, copies of the
server-rendered home page with modified stylesheets were served as static
files through the same proxy.

## Where the 253 KB come from

Tailwind source attribution (compiling `main.css` with the Tailwind node
API and removing the candidates unique to each `@source`):

- Nuxt UI registers the theme files of all 120 components as Tailwind
  sources (`@source "./ui"` in the generated `ui.css`), although the
  storefront renders 49 of them (63 with their dependencies). The colour
  and state variants of the unused ones (Calendar, Table, CommandPalette,
  Editor, Dashboard, Chat, …) were 59 KB, 7 KB gzipped.
- The Nuxt UI prose theme (`ui/prose`, present because `@nuxt/content` is
  installed) is 41 KB, 4 KB gzipped, and only the legal pages use it.
- `UButton` alone is 17 KB (7 colours × 4 variants × states), the
  storefront's own classes 16 KB, `UTabs` 10 KB, `UDropdownMenu` 8 KB,
  `UNavigationMenu` 7 KB.
- Without any utility: 18 KB of theme variables, `@property`
  registrations, preflight, keyframes and 29 `@font-face` blocks.
- All seven colour aliases (`primary`, `secondary`, `success`, `info`,
  `warning`, `error`, `neutral`) are used by the storefront, so
  `theme.colors` cannot be narrowed without design changes.

## What the Style & Layout time is made of

The stylesheet is not the cost. On the home page (300 elements, 4× CPU):

- Selector matching for the whole load is 11–14 ms; the most attempted
  selectors are prose rules with `::marker` and `> ul` (1,154 attempts,
  0 matches), not the `data-*`, `:has()` or `.dark` variants.
- The first style recalculation is 52 ms with the full stylesheet and
  36 ms with no stylesheet at all; the first layout is 140–175 ms.
- Removing the `@property` registrations, pre-resolving `oklch()` /
  `color-mix()`, or dropping `text-wrap: pretty/balance` changes nothing
  measurable.
- Replacing the font stack with `system-ui` takes the first layout from
  143 ms to 15 ms.

The font stack was
`"Public Sans", "Public Sans Fallback: BlinkMacSystemFont", "… Segoe UI",
"… Helvetica Neue", "… Arial", "… Noto Sans", sans-serif`: `@nuxt/fonts`
(enabled by Nuxt UI) generates a metric-adjusted `local()` face for each
of its five default fallback families. During the first layout, before the
web font has arrived, Chrome resolves every family in the stack for every
text style in use, and each family that is not installed costs a system
font lookup (fontconfig here, the unique-name lookup on Android). In
Lighthouse terms, static copies of the home page measured:

| Font stack | Style & Layout |
| --- | --- |
| Public Sans + 5 fallback families (as shipped) | 743–869 ms |
| Public Sans + 2 fallback families | 480–514 ms |
| Public Sans + 1 fallback family | 433–442 ms |
| Public Sans only | 339–378 ms |
| `system-ui` (no web font) | 226–264 ms |

The metric fallbacks made no difference to CLS in any run (0.058 on the
home page from the hero row, 0.001 on the category page).

The lookups are wall-clock work in the browser process, not renderer CPU:
the first layout of the live page takes 63 ms at 1× and 75 ms at 4× CPU
throttling, while the same page without fallback families scales from
8.5 ms to 24 ms. Lighthouse multiplies observed durations by the CPU
multiplier, so every remaining fallback family shows up as roughly 100 ms
of Style & Layout on this machine (fontconfig, 2,183 installed fonts); on
a phone the per-family cost is smaller but not zero (Chrome's local font
lookup is a synchronous call into the browser process).

The rest of the time is the first render itself plus hydration: after the
entry chunk runs, a 285-element recalculation and a full layout
(28 ms + 24 ms at 4×) follow the DOM patches of hydration.

## Changes

1. `ui.experimental.componentDetection: true` (`nuxt.config.ts`): Nuxt UI
   scans the layers for `<U…>` / `LazyU…` usages and registers only those
   component themes (plus dependencies) as Tailwind sources; the themes of
   the others are emptied. Components rendered dynamically by name would
   need to be listed in the option's array form.
2. `fonts.defaults.fallbacks["sans-serif"]` limited to `Roboto` and
   `Helvetica Neue` (Android and iOS system fonts; the storefront is
   phone-first). Windows and Linux desktops fall back to their default
   sans-serif without metric adjustment during the swap.
3. `app.config.ts`: `ui.colors.primary` is the alias `brand` instead of the
   hex value, which produced eleven invalid
   `--ui-color-primary-*: var(--color-#ff5b00-*, )` declarations in the
   inlined `nuxt-ui-colors` style and left `primary-*` utilities without a
   value. `--ui-primary` is still set in `main.css` (600 / 400 steps,
   #275). The `gray: "cool"` key was a Nuxt UI v2 leftover.

## Results (Lighthouse mobile, two runs each)

| Page | Metric | Baseline | After |
| --- | --- | --- | --- |
| `/` | Style & Layout | 763–875 ms | 488–566 ms |
| `/` | Performance | 74–75 | 75 |
| `/c/Pizza/` | Style & Layout | 861–912 ms | 546–576 ms |
| `/c/Pizza/` | Performance | 75–80 | 79–80 |
| stylesheet | `entry.*.css` | 253 KB / 32.5 KB gzip | 194 KB / 25.5 KB gzip |

The 20 KB gzip target of the issue is not reached: the remaining 25 KB
are the components the storefront does use (`UButton` with all colour
variants, `UNavigationMenu`, `USelectMenu`, …), the prose theme for the
content pages (4 KB) and the theme/preflight base (3 KB). Since the
stylesheet size has no measurable effect on Style & Layout, further
trimming (a separate prose stylesheet for the content pages, fewer colour
aliases) is a transfer-size topic, not a main-thread one.

## Tooling

`scripts/perf/h2-proxy.cjs` (TLS + HTTP/2 + gzip in front of the Nitro
server, plus a static `/exp/` directory for page variants),
`scripts/perf/lighthouse.sh` (mobile run with the main-thread breakdown
per page) and `scripts/perf/first-render.mjs` (first style recalculation
and layout via CDP, optional request blocking) are checked in so the
setup of the #273/#314/#319 notes does not have to be rebuilt.
`test/visual/` holds the Playwright screenshot suite used for the
before/after comparison (`pnpm playwright test --config
test/visual/playwright.config.ts --update-snapshots` on the baseline,
then without the flag).

## Verification

- Playwright screenshots (home, category, product card options, cart
  drawer, checkout, footer; light and dark; 390 px and 1280 px) are
  pixel-identical to the baseline after each step (24 images, `maxDiffPixels: 0`).
- The inlined colour style now maps `--ui-color-primary-*` to the brand
  scale; no `var(--color-#…)` left.
- Unit tests, Prettier, ESLint, typecheck and build pass.

## Not done / follow-ups

- Prose theme (4 KB gzip) ships on every page; a page-level stylesheet
  for `[...all].vue` would need the generated `#build/ui/prose` directory
  as a Tailwind source, whose location differs between dev and build.
- `@nuxt/fonts` still emits italic faces (unused by the storefront) and
  the Vietnamese subset (kept on purpose: Vietnamese menus).
- The hydration recalculation/layout pair after the entry chunk runs is
  the next largest Style & Layout item; it belongs to the hydration
  strategy (#314), not to the stylesheet.
