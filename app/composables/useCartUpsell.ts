import type { Schemas } from "#shopware";

const UPSELL_LIMIT = 6;

/**
 * Suggestions on the order confirmation step (#338): products flagged with the custom
 * field `shopbite_cart_upsell`, added with quantity 1 in one click. Named
 * "upsell" because "cross-selling" already means the extras of a product.
 */
export function useCartUpsell() {
  const { apiClient } = useShopwareContext();
  const { addLineItems } = useCartMutations();
  const { triggerCartItemAdded } = useProductEvents();
  const { trackUpsellAdd } = useTrackEvent();

  const pendingProductIds = ref(new Set<string>());

  async function loadUpsellProducts(): Promise<Schemas["Product"][]> {
    try {
      const result = await apiClient.invoke("readProduct post /product", {
        // A flag on a variant parent applies to all its variants.

        // @ts-expect-error sw-inheritance is missing from the generated header type
        headers: { "sw-inheritance": "true" },
        body: {
          filter: [
            {
              type: "equals",
              field: "customFields.shopbite_cart_upsell",
              value: true,
            },
            // No variant parents: one click cannot choose a variant. Shopware
            // only counts the children of main products, so the child count
            // of a variant is null, not 0.
            {
              type: "multi",
              operator: "or",
              queries: [
                { type: "equals", field: "childCount", value: 0 },
                { type: "equals", field: "childCount", value: null },
              ],
            },
          ],
          limit: UPSELL_LIMIT,
          sort: [{ field: "name", order: "ASC" }],
          includes: {
            product: [
              "id",
              "productNumber",
              "name",
              "translated",
              "calculatedPrice",
              "available",
              "cover",
            ],
            calculated_price: ["totalPrice"],
            product_media: ["media"],
            media: ["url", "thumbnails"],
            media_thumbnail: ["url", "width"],
          },
          associations: {
            cover: { associations: { media: {} } },
          },
        },
      });
      return result.data.elements;
    } catch (e) {
      console.error("[useCartUpsell][loadUpsellProducts]", e);
      return [];
    }
  }

  function isAdding(productId: string): boolean {
    return pendingProductIds.value.has(productId);
  }

  async function addUpsellProduct(product: Schemas["Product"]): Promise<void> {
    if (isAdding(product.id)) return;
    pendingProductIds.value.add(product.id);

    try {
      // Failures are reported by useCartMutations; it resolves undefined.
      const newCart = await addLineItems([
        { id: product.id, quantity: 1, type: "product" },
      ]);
      if (!newCart) return;

      triggerCartItemAdded(product, 1);
      trackUpsellAdd(product, 1);
    } finally {
      pendingProductIds.value.delete(product.id);
    }
  }

  return {
    loadUpsellProducts,
    addUpsellProduct,
    isAdding,
  };
}
