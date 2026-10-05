import type { Schemas } from "#shopware";
import type { LocationQueryRaw } from "vue-router";
import { PRODUCT_QUICK_VIEW_PARAM } from "../utils/productUrl";

/**
 * The product quick view (options, quantity, add to cart) is a drawer over
 * the listing whose state lives in the URL: `?produkt=<productNumber>` opens
 * it, so a product can be linked and the back button closes it (#325).
 * A number that is not in the list (a variant, #289) is loaded from the
 * Store API; the quick view then opens with the variant's options selected.
 */
export function useProductQuickView(
  products: MaybeRefOrGetter<Schemas["Product"][]>,
) {
  const route = useRoute();
  const router = useRouter();
  const { apiClient } = useShopwareContext();

  const requestedNumber = computed(() => {
    const value = route.query[PRODUCT_QUICK_VIEW_PARAM];
    return typeof value === "string" && value !== "" ? value : undefined;
  });

  const listed = computed(() =>
    requestedNumber.value
      ? toValue(products).find(
          (candidate) => candidate.productNumber === requestedNumber.value,
        )
      : undefined,
  );

  const loaded = shallowRef<Schemas["Product"]>();
  watch(
    [requestedNumber, () => toValue(products).length],
    async ([number, count]) => {
      // Only in the browser (the drawer is client-only) and once the list
      // is there, so a listed product never costs a request.
      if (!import.meta.client || !number || count === 0 || listed.value) {
        return;
      }
      if (loaded.value?.productNumber === number) return;
      const result = await loadProductByNumber(apiClient, number);
      if (requestedNumber.value === number) loaded.value = result;
    },
    { immediate: true },
  );

  const product = computed(
    () =>
      listed.value ??
      (loaded.value && loaded.value.productNumber === requestedNumber.value
        ? loaded.value
        : undefined),
  );

  // The drawer is created on first use, not with the page (#314).
  const mounted = ref(false);
  watch(
    product,
    (value) => {
      if (value) mounted.value = true;
    },
    { immediate: true },
  );

  const open = computed({
    get: () => product.value !== undefined,
    set: (value) => {
      if (!value) close();
    },
  });

  function show(candidate: Schemas["Product"]) {
    if (requestedNumber.value === candidate.productNumber) return;
    router.push({
      query: {
        ...route.query,
        [PRODUCT_QUICK_VIEW_PARAM]: candidate.productNumber,
      } satisfies LocationQueryRaw,
    });
  }

  function close() {
    if (!requestedNumber.value) return;
    const { [PRODUCT_QUICK_VIEW_PARAM]: _omitted, ...query } = route.query;
    router.replace({ query });
  }

  return { product, open, mounted, show, close };
}

/** A product (usually a variant) by its number, as the quick view needs it. */
async function loadProductByNumber(
  apiClient: ReturnType<typeof useShopwareContext>["apiClient"],
  productNumber: string,
): Promise<Schemas["Product"] | undefined> {
  try {
    const result = await apiClient.invoke("readProduct post /product", {
      // Variants inherit name, cover and properties from their parent.

      // @ts-expect-error sw-inheritance is missing from the generated header type
      headers: { "sw-inheritance": "true" },
      body: {
        filter: [
          { type: "equals", field: "productNumber", value: productNumber },
        ],
        limit: 1,
        includes: {
          product: [
            "id",
            "parentId",
            "productNumber",
            "name",
            "translated",
            "description",
            "sortedProperties",
          ],
          property_group: ["id", "name", "translated", "options"],
          property_group_option: ["id", "name", "translated"],
        },
        associations: {
          properties: { associations: { group: {} } },
        },
      },
    });
    return result.data.elements?.[0];
  } catch (error) {
    console.error("[useProductQuickView] product not found", error);
    return undefined;
  }
}
