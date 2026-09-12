import type { Schemas } from "#shopware";
import type { LocationQueryRaw } from "vue-router";

/** Query parameter that holds the product number of the open quick view. */
export const PRODUCT_QUICK_VIEW_PARAM = "produkt";

/**
 * The product quick view (options, quantity, add to cart) is a drawer over
 * the listing whose state lives in the URL: `?produkt=<productNumber>` opens
 * it, so a product can be linked and the back button closes it (#325).
 */
export function useProductQuickView(
  products: MaybeRefOrGetter<Schemas["Product"][]>,
) {
  const route = useRoute();
  const router = useRouter();

  const requestedNumber = computed(() => {
    const value = route.query[PRODUCT_QUICK_VIEW_PARAM];
    return typeof value === "string" && value !== "" ? value : undefined;
  });

  const product = computed(() =>
    requestedNumber.value
      ? toValue(products).find(
          (candidate) => candidate.productNumber === requestedNumber.value,
        )
      : undefined,
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
