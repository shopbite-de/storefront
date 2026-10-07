# #434: property groups projected in product, variant and search routes

As of 2026-10-07, branch `fix/issue-434-property-group-projection`. Follow-up of the listing fix in #435 (`docs/notes/2026-10-07-listing-payload.md`).

## Change

All Store API projections used the key `property` for property groups. The entity is `property_group`, so Shopware returned the groups with every field. `product_option` is no entity either (options are `property_group_option`), so that key had no effect and is removed.

- `server/api/product/[productId].get.ts` and `server/api/product/variant.get.ts`: `property_group: ["id", "name", "translated", "options"]`. Options keep `group`: the configurator reads `option.group.id`, the ingredient selection `option.group.name`.
- `server/api/search.get.ts`: same projection as the listing (#435), because the search page renders the same cards: `property_group` with `displayType`, options without `group`, no `properties`/`propertyIds`.
- `app/components/Product/Category.vue` deleted: it was rendered nowhere (only recursively by itself), neither in the storefront nor in La Fattoria or the quickstart repo.

## Verification (demo backend, `main` build against branch build)

| Route | Requests | Size before → after | Differences |
| --- | --- | --- | --- |
| `/api/product/[productId]` | all 63 listing products | 294 → 178 KB | none in the fields read (see below) |
| `/api/product/variant` | all 66 option combinations of the 21 variant products | 154 → 95 KB | none |
| `/api/search` | `pizza`, `salami`, `vegan`, `cola` | `pizza` 113 → 35 KB | cards and filters equal |

Compared fields: name, description, price, `optionIds`, options and properties with their group id and name, `sortedProperties`, cover, categories, configurator settings, children and the `configurator` groups.

For 5 parent products the route returned a different variant in the two builds. Shopware picks the variant of a parent without a main variant at random on every request (five direct Store API requests for the same parent gave four different variants, with either include key), and the route caches the first answer for 24 hours. The configurator of these parents and both variants of each were compared by variant id: equal.

Browser (desktop, quick view via deep link): for `LF-20` (ingredients) and `LF-112` (variants), drawer text, variant switch, URL (`?produkt=LF-112-reis`, `?ohne=Eisbergsalat`) and the cart request (`"label":"Beilagensalat -Eisbergsalat"`) are identical in both builds. Both builds log "Hydration completed but contains mismatches" on a deep link to a category page (#425).

Typecheck, ESLint, Prettier, unit tests (348) pass.
