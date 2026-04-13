import type { Product } from "~/types/commerce/product";

export function useProductSearchSuggest() {
  const searchTerm = ref("");
  const loading = ref(false);
  const products = ref<Product[]>([]);

  const getProducts = computed(() => products.value);

  async function search() {
    if (!searchTerm.value.trim()) {
      products.value = [];
      return;
    }
    loading.value = true;
    try {
      const result = await $fetch<{ elements: Product[] }>("/api/search", {
        query: { query: searchTerm.value },
      });
      products.value = result.elements ?? [];
    } catch (error) {
      console.error("[useProductSearchSuggest]", error);
      products.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { searchTerm, search, getProducts, loading };
}
