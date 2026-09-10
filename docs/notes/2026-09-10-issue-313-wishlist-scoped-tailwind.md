# Issue #313: Wishlist.vue re-imported Tailwind and Nuxt UI

As of 2026-09-10, branch `fix/313-wishlist-scoped-tailwind`.

## Cause

`app/components/Wishlist.vue` ended with a `<style scoped>` block that
started with `@import "tailwindcss"` and `@import "@nuxt/ui"` to make two
`@apply` rules for `h1`/`h2` resolve. Tailwind v4 emits the complete base
and the Nuxt UI theme into that scoped stylesheet, so the build shipped a
second `merkliste.*.css` of 288 KB (32 KB gzipped) next to the global
`entry.css` (253 KB). The component renders no `h1`/`h2`; the rules
matched nothing.

## Solution

Remove the `<style>` block. No other component imports Tailwind inside a
`<style>` (`Contact/Form.vue` has a plain scoped rule). If a component
needs `@apply` in the future, use `@reference "tailwindcss"` (Tailwind v4)
instead of `@import`; it resolves utilities without re-emitting the base.

## Verification

- Production build: the `merkliste.*.css` chunk is gone; the remaining
  chunks are `entry.css` (253 KB) and `kontakt.css` (117 B).
- `/merkliste` on the production build against the La Fattoria Store API
  loads only `entry.css` (25 KB gzipped), renders the empty-wishlist state
  as before, no console errors.
- Prettier and ESLint pass.
