import type { LocationQueryRaw } from "vue-router";
import type { Dish, DishDetail } from "../../shared/domain";
import {
  EXTRAS_PARAM,
  PRODUCT_QUICK_VIEW_PARAM,
  WITHOUT_INGREDIENTS_PARAM,
  parseListParam,
  withQuickViewConfiguration,
  type QuickViewConfiguration,
} from "../utils/productUrl";

// Numbers the open quick view switched to itself (variant switch, #411):
// the URL follows the selection, but the drawer keeps its dish.
const SWITCHED_NUMBERS_KEY = "quick-view-switched-numbers";

/**
 * The dish sheet (options, quantity, add to cart) is a drawer over the
 * listing whose state lives in the URL: `?produkt=<menu number>` opens it,
 * so a dish can be linked and the back button closes it (#325). A number
 * that is not in the list (a variant, #289) is loaded from the BFF
 * (`/api/menu/dishes?number=`); the sheet then opens with the variant's
 * options selected. The configuration (variant, deselected ingredients,
 * extras) is kept in the URL as well, see useQuickViewConfiguration
 * (#411).
 */
export function useProductQuickView(dishes: MaybeRefOrGetter<readonly Dish[]>) {
  const route = useRoute();
  const router = useRouter();
  const switchedNumbers = useState<string[]>(SWITCHED_NUMBERS_KEY, () => []);

  const requestedNumber = computed(() => {
    const value = route.query[PRODUCT_QUICK_VIEW_PARAM];
    return typeof value === "string" && value !== "" ? value : undefined;
  });

  const listed = computed(() =>
    requestedNumber.value
      ? toValue(dishes).find(
          (candidate) => candidate.number === requestedNumber.value,
        )
      : undefined,
  );

  const loaded = shallowRef<Dish>();
  watch(
    [requestedNumber, () => toValue(dishes).length],
    async ([number, count]) => {
      // Only in the browser (the drawer is client-only) and once the list
      // is there, so a listed dish never costs a request.
      if (!import.meta.client || !number || count === 0 || listed.value) {
        return;
      }
      if (switchedNumbers.value.includes(number)) return;
      if (loaded.value?.number === number) return;
      const result = await loadDishByNumber(number);
      if (requestedNumber.value === number) loaded.value = result;
    },
    { immediate: true },
  );

  const resolved = computed(
    () =>
      listed.value ??
      (loaded.value && loaded.value.number === requestedNumber.value
        ? loaded.value
        : undefined),
  );

  const opened = shallowRef<Dish>();
  const dish = computed(() => {
    const number = requestedNumber.value;
    if (!number) return undefined;
    if (opened.value && switchedNumbers.value.includes(number)) {
      return opened.value;
    }
    return resolved.value;
  });

  watch(
    dish,
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
    dish,
    (value) => {
      if (value) mounted.value = true;
    },
    { immediate: true },
  );

  const open = computed({
    get: () => dish.value !== undefined,
    set: (value) => {
      if (!value) close();
    },
  });

  function show(candidate: Dish) {
    if (requestedNumber.value === candidate.number) return;
    router.push({
      query: withQuickViewConfiguration(route.query, {
        productNumber: candidate.number,
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

  return { dish, open, mounted, show, close };
}

/**
 * The configuration of the open quick view in the URL (#411): `initial` is
 * what the URL carries (the detail components read it once, when a dish
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

/** A dish (usually a variant) by its menu number, as the sheet opens it. */
async function loadDishByNumber(number: string): Promise<Dish | undefined> {
  try {
    const detail = await $fetch<DishDetail>("/api/menu/dishes", {
      query: { number },
    });
    return dishForNumber(detail, number);
  } catch (error) {
    console.error("[useProductQuickView] dish not found", error);
    return undefined;
  }
}
