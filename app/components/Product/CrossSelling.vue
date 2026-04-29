<script setup lang="ts">
import type { Product } from "~/types/commerce/product";
import type { AssociationItemProduct } from "~/types/Association";

const LOADING_ICON = "i-lucide-loader";

const props = defineProps<{
  product: Product;
}>();

const emit = defineEmits<{
  "extras-selected": [selectedExtras: AssociationItemProduct[]];
}>();

const selectedExtras = ref<AssociationItemProduct[]>([]);

const { associationItems, isAssociationsLoading } = useProductCrossSelling(
  () => props.product.id,
);

watch(selectedExtras, () => emit("extras-selected", selectedExtras.value), {
  deep: true,
});
</script>

<template>
  <div v-if="!isAssociationsLoading" class="my-4">
    <div
      v-for="association in associationItems"
      :key="association.label"
      class=""
    >
      <div class="flex flex-row gap-2 items-center">
        <div class="basis-1/3">{{ association.label }}:</div>
        <UInputMenu
          v-model="selectedExtras"
          class="w-full"
          :loading="isAssociationsLoading"
          :loading-icon="LOADING_ICON"
          multiple
          :items="association.products"
          icon="i-lucide-plus"
        >
          <template #item-trailing="{ item }">
            <span class="">
              {{ item.price }}
            </span>
          </template>
        </UInputMenu>
      </div>
    </div>
  </div>
</template>
