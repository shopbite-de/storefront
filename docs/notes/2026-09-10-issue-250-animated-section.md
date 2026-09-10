# Issue #250: AnimatedSection rendered content invisible in the SSR HTML

As of 2026-09-10, branch `fix/250-animated-section-ssr-visible`.

## Cause

`useScrollAnimation` started with `isVisible = false`, and `AnimatedSection` rendered the initial animation classes (`opacity-0 translate-y-20`) for that state, on the server as well. Every product card, the features, the marquee and the top sellers were transparent until the `IntersectionObserver` fired after hydration: invisible for no-JS visitors and crawlers, and a flash of empty page on slow devices even above the fold. It also caused the remaining CLS of 0.028 on the home page (#273) once the sections faded in.

## Solution

The state is inverted to `isHidden`, default `false`:

- Server HTML and the client's first render carry the final classes (`opacity-100 translate-y-0`), so hydration matches (#239).
- After mount the observer's first callback decides: an element already in the viewport stays visible and is unobserved (no animation above the fold); an element below the fold gets the hidden classes and animates in when it scrolls into view. Nobody sees the switch to hidden, because it only happens off-screen.
- `prefers-reduced-motion: reduce`, a missing `IntersectionObserver` or a missing element: no observer, nothing is ever hidden.
- The observer is disconnected on unmount.
- The observer's root margin extends 100000 px above the viewport, so a section that a jump scrolled past (anchor link such as `#food`, End key, restored scroll position) counts as in view and is revealed too. Found with Playwright: after `mouse.wheel(0, 20000)` the last product card sat above the viewport and stayed at `opacity: 0`, with the old implementation as well.

Tests: `test/nuxt/useScrollAnimation.test.ts` (rewritten for the new state machine), `test/nuxt/AnimatedSection.test.ts` (SSR string contains the content without `opacity-0`; hide/reveal after mount).

## Verification

See the PR description.
