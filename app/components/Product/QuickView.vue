<script setup lang="ts">
import type { Schemas } from "#shopware";
import { DialogDescription, DialogTitle } from "reka-ui";

const props = defineProps<{
  product: Schemas["Product"] | undefined;
}>();

const open = defineModel<boolean>("open", { required: true });

const { initial, update: updateConfiguration } = useQuickViewConfiguration();
const { share, canShare } = useShareLink();

const sortedProperties = computed(
  () =>
    props.product?.sortedProperties as Schemas["PropertyGroup"][] | undefined,
);
const label = ref(props.product?.translated.name ?? props.product?.name ?? "");
const description = ref(props.product?.description);
// Follows the selected variant, like the URL (#411).
const productNumber = ref(props.product?.productNumber);
// Built in script: a trailing space in the template would be condensed away.
const numberLabel = computed(() => `Nr. ${productNumber.value} `);

watch(
  () => props.product,
  (product) => {
    if (!product) return;
    label.value = product.translated.name ?? product.name;
    description.value = product.description;
    productNumber.value = product.productNumber;
  },
);

// The base sheet with a bon header (#442).
const diets = computed(() =>
  getDiets(sortedProperties.value).map((diet) =>
    diet === "vegan" ? "Vegan" : "Vegetarisch",
  ),
);

function onVariantSelected(variant: Schemas["Product"]) {
  label.value = variant.translated.name ?? variant.name;
  description.value = variant.translated.description ?? variant.description;
  productNumber.value = variant.productNumber;
}
</script>

<template>
  <SbSheet
    v-model:open="open"
    :title="label"
    :description="description ?? undefined"
  >
    <!-- Long single words ("Camembertkäse") hyphenate (lang="de") or
         break instead of being clipped by the card (#442). -->
    <template #header>
      <div
        class="grid grid-cols-[64px_minmax(0,1fr)] overflow-hidden rounded-sb-card border border-sb-line bg-sb-surface"
      >
        <span
          aria-hidden="true"
          :class="[
            'flex items-center justify-center border-r-2 border-dashed border-sb-line bg-sb-muted px-1.5 text-center font-display tabular-nums',
            (productNumber?.length ?? 0) <= 3
              ? 'text-xl whitespace-nowrap'
              : (productNumber?.length ?? 0) <= 6
                ? 'text-[15px] whitespace-nowrap'
                : 'text-xs leading-tight [overflow-wrap:anywhere]',
          ]"
          >{{ productNumber }}</span
        >
        <div class="flex min-w-0 flex-col gap-1 px-3.5 py-3">
          <DialogTitle
            class="font-display text-xl leading-tight hyphens-auto [overflow-wrap:anywhere] sm:text-2xl"
          >
            <span class="sr-only">{{ numberLabel }}</span
            >{{ label }}
          </DialogTitle>
          <DialogDescription
            v-if="description || diets.length"
            class="text-sm text-sb-ink-muted"
          >
            <span v-if="diets.length" class="font-semibold text-sb-primary-ink"
              >{{ diets.join(" · ") }}{{ description ? " · " : "" }}</span
            >{{ description }}
          </DialogDescription>
        </div>
      </div>
    </template>
    <template #actions>
      <SbIconButton
        :label="canShare ? 'Teilen' : 'Link kopieren'"
        @click="share({ title: label, productNumber })"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
          <path d="M16 6l-4-4-4 4M12 2v13" />
        </svg>
      </SbIconButton>
    </template>
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
  </SbSheet>
  <!-- Only the body scrolls: header and footer stay in place without sticky
       positioning, and shrink-0 keeps the flex column from squeezing the
       header to its min-height (#325). -->
</template>
