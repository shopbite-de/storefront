<script setup lang="ts">
import type { Extra, Variant } from "../../../shared/domain";
import type { QuickViewConfiguration } from "~/utils/productUrl";
import type { WishlistConfiguration } from "~/composables/useWishlistEntries";

const props = defineProps<{
  /** A dish, or a variant (its dish opens with the variant selected). */
  dishId: string;
  // Configuration from the dish sheet URL (#411).
  initialWithout?: string[];
  initialExtras?: string[];
}>();

const emit = defineEmits<{
  "product-added": [];
  "variant-selected": [variant: Variant];
  "configuration-changed": [configuration: QuickViewConfiguration];
  // The dish as configured right now, for the save button (#467).
  "selection-changed": [selection: WishlistConfiguration];
}>();

const {
  detail,
  pending,
  selectedDish,
  selectedQuantity,
  isLoading,
  addToCart,
  setSelectedDish,
  onExtrasSelected,
  onIngredientsDeselected,
} = useProductDetail(() => props.dishId);

const { getFormattedMoney } = useCommercePrice();

const selectedExtras = ref<Extra[]>([]);
const deselectedIngredients = ref<string[]>([]);

/** The options of the variant the sheet starts with. */
const startOptionIds = computed(() =>
  detail.value ? (selectedVariant(detail.value)?.optionIds ?? []) : [],
);

function onExtras(extras: Extra[]) {
  selectedExtras.value = extras;
  onExtrasSelected(extras);
  emitConfiguration();
}

function onIngredients(deselected: string[]) {
  deselectedIngredients.value = deselected;
  onIngredientsDeselected(deselected);
  emitConfiguration();
}

function emitConfiguration() {
  const number = selectedDish.value?.number;
  if (!number) return;
  emit("configuration-changed", {
    productNumber: number,
    without: deselectedIngredients.value,
    extras: selectedExtras.value.map((extra) => extra.number),
  });
}

watch(
  () => {
    const dish = selectedDish.value;
    if (!dish?.number) return undefined;
    return {
      productId: dish.id,
      productNumber: dish.number,
      without: [...deselectedIngredients.value],
      extras: selectedExtras.value.map((extra) => extra.number),
    };
  },
  (selection) => {
    if (selection) emit("selection-changed", selection);
  },
  { immediate: true, deep: true },
);

// Dish plus extras, times the quantity: what the button will add.
const total = computed(() => {
  const dish = selectedDish.value;
  if (!dish) return null;
  return sumMoney(
    [dish.price, ...selectedExtras.value.map((extra) => extra.price)],
    dish.price.currency,
    selectedQuantity.value,
  );
});

const isAvailable = computed(() => selectedDish.value?.available ?? true);

const onVariantSwitched = (variant: Variant) => {
  setSelectedDish(variant, detail.value?.id);
  emit("variant-selected", variant);
  emitConfiguration();
};

const onAddToCart = () => emit("product-added");

const dishName = computed(() => selectedDish.value?.name || "Gericht");
</script>

<template>
  <div class="flex flex-1 flex-col gap-5">
    <!-- One placeholder in the shape of the loaded body (options,
         ingredients, extras), shown until the dish is loaded. -->
    <div
      v-if="pending"
      class="flex flex-col gap-5 motion-safe:animate-pulse"
      aria-busy="true"
    >
      <div class="flex flex-col gap-2">
        <div class="h-5 w-24 rounded bg-sb-muted" />
        <div class="h-11 w-full rounded bg-sb-muted" />
      </div>
      <div class="flex flex-col gap-2">
        <div class="h-5 w-20 rounded bg-sb-muted" />
        <div class="flex flex-wrap gap-2">
          <div class="h-8 w-20 rounded-full rounded bg-sb-muted" />
          <div class="h-8 w-24 rounded-full rounded bg-sb-muted" />
          <div class="h-8 w-16 rounded-full rounded bg-sb-muted" />
          <div class="h-8 w-28 rounded-full rounded bg-sb-muted" />
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <div class="h-5 w-28 rounded bg-sb-muted" />
        <div
          v-for="row in 4"
          :key="row"
          class="h-7 w-full rounded bg-sb-muted"
        />
      </div>
    </div>
    <template v-else-if="detail">
      <ProductConfigurator
        :dish-id="detail.id"
        :groups="detail.variantGroups"
        :selected-option-ids="startOptionIds"
        @variant-switched="onVariantSwitched"
      />
      <ProductDeselectIngredient
        v-if="selectedDish"
        :ingredients="selectedDish.ingredients"
        :initial-deselected="initialWithout"
        @ingredients-deselected="onIngredients"
      />
      <ProductCrossSelling
        v-if="detail.extraGroups.length > 0"
        :groups="detail.extraGroups"
        :initial-extras="initialExtras"
        @extras-selected="onExtras"
      />
    </template>

    <!-- -bottom-5/-mb-5 cover the sheet body's bottom padding, which sticky
         positioning keeps free and the list scrolled through (#442). -->
    <div
      class="sticky -bottom-5 -mx-5 -mb-5 mt-auto flex items-center gap-2.5 border-t border-sb-line bg-sb-surface px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
    >
      <SbStepper
        v-model="selectedQuantity"
        :item-name="dishName"
        :max="100"
        size="lg"
      />
      <SbButton
        size="lg"
        class="min-h-14 min-w-0 flex-1 justify-between px-5"
        :disabled="pending || !isAvailable"
        :loading="isLoading"
        @click="addToCart(onAddToCart)"
      >
        <span>{{ isAvailable ? "In den Warenkorb" : "Ausverkauft" }}</span>
        <span v-if="isAvailable && !pending" class="tabular-nums">
          {{ getFormattedMoney(total) }}
        </span>
      </SbButton>
    </div>
  </div>
</template>
