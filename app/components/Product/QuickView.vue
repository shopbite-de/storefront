<script setup lang="ts">
import type { Schemas } from "#shopware";
import { useMediaQuery } from "@vueuse/core";
import { DialogDescription, DialogTitle } from "reka-ui";

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

// Presets use the base sheet with a bon header (#442).
const { hasPreset } = useThemePreset();
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
    v-if="hasPreset"
    v-model:open="open"
    :title="label"
    :description="description ?? undefined"
  >
    <template #header>
      <div
        class="grid grid-cols-[minmax(56px,auto)_minmax(0,1fr)] overflow-hidden rounded-sb-card border border-sb-line bg-sb-surface"
      >
        <span
          aria-hidden="true"
          class="flex items-center justify-center border-r-2 border-dashed border-sb-line bg-sb-muted px-2 font-display text-xl whitespace-nowrap tabular-nums"
          >{{ productNumber }}</span
        >
        <div class="flex min-w-0 flex-col gap-1 px-3.5 py-3">
          <DialogTitle class="font-display text-2xl leading-tight">
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
  <UDrawer
    v-else
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
        @click="share({ title: label, productNumber })"
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
