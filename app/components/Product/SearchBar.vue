<script setup lang="ts">
import { ref } from "vue";
import { onClickOutside, useDebounceFn, useFocus } from "@vueuse/core";
import type { Schemas } from "#shopware";
import { useTrackEvent } from "#imports";

withDefaults(
  defineProps<{
    searchInProgress?: boolean;
  }>(),
  {
    searchInProgress: false,
  },
);

const emit =
  defineEmits<(e: "update:searchInProgress", value: boolean) => void>();

const { searchTerm, search, getProducts, loading } = useProductSearchSuggest();
const { onProductAdded } = useProductEvents();

const searchContainer = ref(null);
const searchInput = ref();
const minSearchLength = 1;

const active = ref(false);

// Clear search when product is added to cart
onProductAdded(() => {
  typingQuery.value = "";
  active.value = false;
});

watch(active, (value) => {
  const { focused } = useFocus(searchInput);

  focused.value = value;
});

// String the user has typed in the search field
const typingQuery = ref("");

watch(typingQuery, (value) => {
  if (value.length >= minSearchLength) {
    performSuggestSearch(value);
    emit("update:searchInProgress", true);
  } else {
    emit("update:searchInProgress", false);
  }
});

// Defer the search request to prevent the search from being triggered too after typing
const performSuggestSearch = useDebounceFn((value) => {
  searchTerm.value = value;
  search();
  trackEvent(value);
}, 500);

const trackEvent = useDebounceFn((searchTerm: string) => {
  const searchResult = getProducts.value.map(function (
    product: Schemas["Product"],
  ) {
    return product.productNumber;
  });
  useTrackEvent("search", {
    props: { search_term: searchTerm, search_result: searchResult.join(",") },
  });
}, 500);

if (import.meta.client) {
  onClickOutside(searchContainer, () => {
    active.value = false;
  });
}

const showSuggest = computed(() => {
  return typingQuery.value.length >= minSearchLength && active.value;
});

defineExpose({
  showSuggest,
  products: getProducts,
  loading,
});
</script>

<template>
  <UInput
    v-model="typingQuery"
    name="search"
    class="w-full my-2"
    size="xl"
    :loading="loading"
    placeholder="Suche..."
    :ui="{}"
    @input="active = true"
  >
    <template v-if="typingQuery?.length" #trailing>
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        icon="i-lucide-circle-x"
        aria-label="Clear input"
        @click="typingQuery = ''"
      />
    </template>
  </UInput>
</template>
