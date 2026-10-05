<script setup lang="ts">
import type { Schemas } from "#shopware";
import { useMediaQuery } from "@vueuse/core";

const props = defineProps<{
  product: Schemas["Product"] | undefined;
}>();

const open = defineModel<boolean>("open", { required: true });

const { initial, update: updateConfiguration } = useQuickViewConfiguration();
const { share, canShare } = useShareLink();

// Bottom sheet on phones, side panel from the lg breakpoint (64rem).
const isDesktop = useMediaQuery("(min-width: 64rem)");
const direction = computed(() => (isDesktop.value ? "right" : "bottom"));

const sortedProperties = computed(
  () =>
    props.product?.sortedProperties as Schemas["PropertyGroup"][] | undefined,
);
const label = ref(props.product?.translated.name ?? props.product?.name ?? "");
const description = ref(props.product?.description);
// Follows the selected variant, like the URL (#411).
const productNumber = ref(props.product?.productNumber);

watch(
  () => props.product,
  (product) => {
    if (!product) return;
    label.value = product.translated.name ?? product.name;
    description.value = product.description;
    productNumber.value = product.productNumber;
  },
);

function onVariantSelected(variant: Schemas["Product"]) {
  label.value = variant.translated.name ?? variant.name;
  description.value = variant.translated.description ?? variant.description;
  productNumber.value = variant.productNumber;
}
</script>

<template>
  <!-- Only the body scrolls: header and footer stay in place without sticky
       positioning, and shrink-0 keeps the flex column from squeezing the
       header to its min-height (#325). -->
  <UDrawer
    v-model:open="open"
    :direction="direction"
    :close="true"
    :ui="{
      content: direction === 'right' ? 'w-full max-w-md' : 'max-h-[92vh]',
      container: 'overflow-hidden',
      header: 'shrink-0 items-start border-b border-default pb-3',
      body: 'flex min-h-0 flex-col gap-5 overflow-y-auto',
    }"
  >
    <template #title>
      <span class="flex flex-col gap-0.5">
        <span class="text-xs font-semibold text-primary">
          #{{ productNumber }}
        </span>
        <span class="text-xl font-bold text-highlighted">{{ label }}</span>
      </span>
    </template>
    <template #actions>
      <UButton
        :icon="canShare ? 'i-lucide-share-2' : 'i-lucide-link'"
        color="neutral"
        variant="ghost"
        :aria-label="canShare ? 'Teilen' : 'Link kopieren'"
        @click="share({ title: label })"
      />
    </template>
    <template v-if="description" #description>
      {{ description }}
    </template>
    <template #body>
      <!-- Diet badges only: the ingredients are listed once, in the
           deselectable "Zutaten" section of ProductDetail. -->
      <div class="flex flex-wrap gap-1.5 empty:hidden">
        <ProductCardDietBadges :sorted-properties="sortedProperties" />
      </div>
      <ProductDetail
        v-if="product"
        :key="product.id"
        :product-id="product.id"
        :initial-without="initial.without"
        :initial-extras="initial.extras"
        @product-added="open = false"
        @variant-selected="onVariantSelected"
        @configuration-changed="updateConfiguration"
      />
    </template>
  </UDrawer>
</template>
