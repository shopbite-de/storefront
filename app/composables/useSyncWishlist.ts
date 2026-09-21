import { ApiClientError } from "@shopware/api-client";
import type { ComputedRef, Ref } from "vue";
import type { Schemas } from "#shopware";

/**
 * Overrides `useSyncWishlist` of the `@shopware/composables` layer (1.12.1),
 * including its use inside the layer's `useWishlist`. The only change: a
 * customer without a wishlist (404) or a shop with the wishlist disabled (403)
 * is an expected state and not logged as an error (#366).
 */
export type UseSyncWishlistReturn = {
  getWishlistProducts(
    defaultSearchCriteria?: Schemas["Criteria"],
  ): Promise<void>;
  mergeWishlistProducts(itemsToMerge: string[]): void;
  addToWishlistSync(id: string): void;
  removeFromWishlistSync(id: string): void;
  items: ComputedRef<string[]>;
  count: ComputedRef<number>;
  currentPage: ComputedRef<number>;
  limit: ComputedRef<number>;
  products: ComputedRef<Schemas["Product"][]>;
  isLoading: Ref<boolean>;
};

const EXPECTED_WISHLIST_ERRORS = [
  "CHECKOUT__WISHLIST_NOT_FOUND",
  "CHECKOUT__WISHLIST_IS_NOT_ACTIVATED",
];

function isExpectedWishlistError(error: unknown): boolean {
  const errors = error instanceof ApiClientError ? error.details?.errors : null;
  return (
    Array.isArray(errors) &&
    errors.some((e) => EXPECTED_WISHLIST_ERRORS.includes(e.code))
  );
}

const _wishlistItems: Ref<string[]> = ref([]);
const _wishlistProducts: Ref<Schemas["Product"][]> = ref([]);
const _currentPage: Ref<number> = ref(1);
const _limit: Ref<number> = ref(15);
const totalWishlistItemsCount: Ref<number> = ref(0);
const isLoading: Ref<boolean> = ref(false);

export function useSyncWishlist(): UseSyncWishlistReturn {
  const { apiClient } = useShopwareContext();

  async function addToWishlistSync(id: string) {
    await apiClient.invoke(
      "addProductOnWishlist post /customer/wishlist/add/{productId}",
      {
        pathParams: { productId: id },
      },
    );
  }

  async function removeFromWishlistSync(id: string) {
    await apiClient.invoke(
      "deleteProductOnWishlist delete /customer/wishlist/delete/{productId}",
      {
        pathParams: { productId: id },
      },
    );
  }

  async function getWishlistProducts(
    defaultSearchCriteria?: Schemas["Criteria"],
  ) {
    try {
      const response = await apiClient.invoke(
        "readCustomerWishlist post /customer/wishlist",
        { body: { ...defaultSearchCriteria, "total-count-mode": "exact" } },
      );
      _wishlistItems.value = [
        ...response.data.products.elements.map((element) => element.id),
      ];
      _wishlistProducts.value = response.data.products.elements;
      totalWishlistItemsCount.value = response.data.products.total ?? 0;
      _currentPage.value = response.data.products.page ?? 1;
      _limit.value = response.data.products.limit ?? 15;
    } catch (error) {
      if (!isExpectedWishlistError(error)) {
        console.error("[useSyncWishlist][getWishlistProducts][error]:", error);
      }
      _wishlistItems.value = [];
      _wishlistProducts.value = [];
      totalWishlistItemsCount.value = 0;
    }
  }

  async function mergeWishlistProducts(productIds: string[]) {
    await apiClient.invoke(
      "mergeProductOnWishlist post /customer/wishlist/merge",
      {
        body: { productIds },
      },
    );
  }

  const items = computed(() => _wishlistItems.value);
  const count = computed(() => totalWishlistItemsCount.value);
  const currentPage = computed(() => _currentPage.value);
  const products = computed(() => _wishlistProducts.value);
  const limit = computed(() => _limit.value);

  return {
    getWishlistProducts,
    addToWishlistSync,
    removeFromWishlistSync,
    mergeWishlistProducts,
    products,
    items,
    count,
    currentPage,
    isLoading,
    limit,
  };
}
