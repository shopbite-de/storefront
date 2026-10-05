# Issue #400: ingredients and diet in the MenuItem schema

As of 2026-10-05, branch `feature/400-menu-item-ingredients-diet`. Part of the AI visibility issues #400–#404.

## Finding

On www.pizzeria-lafattoria.de, `/c/Pizza/` carried 29 `MenuItem`s, but only 4 had a `description`: the ingredients live in the `Hauptzutaten` property group, not in the product description. No item said whether it is vegetarian or vegan. AI assistants answering "what is on it / is it vegetarian" had nothing to go on.

## Implementation

- `buildMenuSectionSchema` takes `ingredients` and `diets` per item. The description falls back to the ingredients joined with ", " when the product has none; a product description always wins.
- `suitableForDiet`: `VegetarianDiet` for `Vegetarisch: Ja`, `VegetarianDiet` + `VeganDiet` for `Vegan: Ja` (vegan dishes are vegetarian; shops often flag only `Vegan`).
- `hasYesOption`/`getDiets` moved to `app/utils/product.ts`; `CardDietBadges.vue` uses them, so badges and schema share one rule.
- No extra request: `sortedProperties` is part of the listing the page loads anyway.

## Verification

Production build against the demo backend: `/Speisekarte/Pizza/` 14/14 items with description, 5 with `suitableForDiet`; Salate 5/5 and 2; Nudeln 11/11 and 5. Unit, nuxt tests, typecheck and ESLint green.
