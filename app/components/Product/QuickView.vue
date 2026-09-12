<script setup lang="ts">
import type { Schemas } from "#shopware";
import { useMediaQuery } from "@vueuse/core";

const props = defineProps<{
  product: Schemas["Product"] | undefined;
}>();

const open = defineModel<boolean>("open", { required: true });

// Bottom sheet on phones, side panel from the lg breakpoint (64rem).
const isDesktop = useMediaQuery("(min-width: 64rem)");
const direction = computed(() => (isDesktop.value ? "right" : "bottom"));

const sortedProperties = computed(
  () =>
    props.product?.sortedProperties as Schemas["PropertyGroup"][] | undefined,
);
const label = ref(props.product?.translated.name ?? props.product?.name ?? "");
const description = ref(props.product?.description);

watch(
  () => props.product,
  (product) => {
    if (!product) return;
    label.value = product.translated.name ?? product.name;
    description.value = product.description;
  },
);

function onVariantSelected(variant: Schemas["Product"]) {
  label.value = variant.translated.name ?? variant.name;
  description.value = variant.translated.description ?? variant.description;
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
          #{{ product?.productNumber }}
        </span>
        <span class="text-xl font-bold text-highlighted">{{ label }}</span>
      </span>
    </template>
    <template v-if="description" #description>
      {{ description }}
    </template>
    <template #body>
      <ProductCardIngredients
        :sorted-properties="sortedProperties"
        :with-diet-badges="true"
      />
      <ProductDetail
        v-if="product"
        :key="product.id"
        :product-id="product.id"
        @product-added="open = false"
        @variant-selected="onVariantSelected"
      />
    </template>
  </UDrawer>
</template>
