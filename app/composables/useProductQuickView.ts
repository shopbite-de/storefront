import type { Schemas } from "#shopware";
import type { LocationQueryRaw } from "vue-router";
import {
  EXTRAS_PARAM,
  PRODUCT_QUICK_VIEW_PARAM,
  WITHOUT_INGREDIENTS_PARAM,
  parseListParam,
  withQuickViewConfiguration,
  type QuickViewConfiguration,
} from "../utils/productUrl";

// Numbers the open quick view switched to itself (variant switch, #411):
// the URL follows the selection, but the drawer keeps its product.
const SWITCHED_NUMBERS_KEY = "quick-view-switched-numbers";

/**
 * The product quick view (options, quantity, add to cart) is a drawer over
 * the listing whose state lives in the URL: `?produkt=<productNumber>` opens
 * it, so a product can be linked and the back button closes it (#325).
 * A number that is not in the list (a variant, #289) is loaded from the
 * Store API; the quick view then opens with the variant's options selected.
 * The configuration (variant, deselected ingredients, extras) is kept in the
 * URL as well, see useQuickViewConfiguration (#411).
 */
export function useProductQuickView(
  products: MaybeRefOrGetter<Schemas["Product"][]>,
) {
  const route = useRoute();
  const router = useRouter();
  const { apiClient } = useShopwareContext();
  const switchedNumbers = useState<string[]>(SWITCHED_NUMBERS_KEY, () => []);

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
      if (switchedNumbers.value.includes(number)) return;
      if (loaded.value?.productNumber === number) return;
      const result = await loadProductByNumber(apiClient, number);
      if (requestedNumber.value === number) loaded.value = result;
    },
    { immediate: true },
  );

  const resolved = computed(
    () =>
      listed.value ??
      (loaded.value && loaded.value.productNumber === requestedNumber.value
        ? loaded.value
        : undefined),
  );

  const opened = shallowRef<Schemas["Product"]>();
  const product = computed(() => {
    const number = requestedNumber.value;
    if (!number) return undefined;
    if (opened.value && switchedNumbers.value.includes(number)) {
      return opened.value;
    }
    return resolved.value;
  });

  watch(
    product,
    (value) => {
      if (value === opened.value) return;
      opened.value = value;
      switchedNumbers.value = [];
    },
    { immediate: true },
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
      query: withQuickViewConfiguration(route.query, {
        productNumber: candidate.productNumber,
        without: [],
        extras: [],
      }) as LocationQueryRaw,
    });
  }

  function close() {
    if (!requestedNumber.value) return;
    router.replace({
      query: withQuickViewConfiguration(
        route.query,
        undefined,
      ) as LocationQueryRaw,
    });
  }

  return { product, open, mounted, show, close };
}

/**
 * The configuration of the open quick view in the URL (#411): `initial` is
 * what the URL carries (the detail components read it once, when a product
 * opens), `update` writes the current selection back (replace, no history
 * entry).
 */
export function useQuickViewConfiguration() {
  const route = useRoute();
  const router = useRouter();
  const switchedNumbers = useState<string[]>(SWITCHED_NUMBERS_KEY, () => []);

  const initial = computed(() => ({
    without: parseListParam(route.query[WITHOUT_INGREDIENTS_PARAM]),
    extras: parseListParam(route.query[EXTRAS_PARAM]),
  }));

  function update(configuration: QuickViewConfiguration) {
    // Closed meanwhile (add to cart, back button): nothing to write.
    if (!route.query[PRODUCT_QUICK_VIEW_PARAM]) return;
    if (!switchedNumbers.value.includes(configuration.productNumber)) {
      switchedNumbers.value = [
        ...switchedNumbers.value,
        configuration.productNumber,
      ];
    }
    router.replace({
      query: withQuickViewConfiguration(
        route.query,
        configuration,
      ) as LocationQueryRaw,
    });
  }

  return { initial, update };
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
