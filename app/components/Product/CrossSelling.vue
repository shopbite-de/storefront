<script setup lang="ts">
import type { Schemas } from "#shopware";
import type {
  AssociationItemProduct,
  AssociationItem,
} from "~/types/Association";
import { useShopwareContext } from "#imports";

const DEFAULT_CURRENCY = "EUR";
const DEFAULT_LOCALE = "de-DE";
const LOADING_ICON = "i-lucide-loader";
const DEFAULT_ICON = "i-lucide-plus";

const props = defineProps<{
  product: Schemas["Product"];
}>();

const product = computed(() => props.product);
const selectedExtras = ref<AssociationItemProduct[]>([]);

const { getFormattedPrice } = usePrice({
  currencyCode: DEFAULT_CURRENCY,
  localeCode: DEFAULT_LOCALE,
});

function mapAssociationToItems(
  associations: Schemas["CrossSellingElement"][],
): AssociationItem[] {
  return associations.map((crossSellingElement) => ({
    label: crossSellingElement.crossSelling.name,
    products: crossSellingElement.products.map(
      (product: Schemas["Product"]) => ({
        label: product.name,
        value: product.id,
        price: getFormattedPrice(product.calculatedPrice.unitPrice),
        icon: DEFAULT_ICON,
      }),
    ),
  }));
}

const { apiClient } = useShopwareContext();

const { data: productAssociations, pending: isAssociationsLoading } =
  useAsyncData(`cross-selling-${product.value.id}`, async () => {
    const response = await apiClient.invoke(
      "readProductCrossSellings post /product/{productId}/cross-selling",
      {
        pathParams: { productId: product.value.id },
      },
    );

    return response.data;
  });

const associationItems = computed(() =>
  mapAssociationToItems(productAssociations.value ?? []),
);

watch(selectedExtras, () => emit("extras-selected", selectedExtras.value), {
  deep: true,
});

const emit = defineEmits<{
  "extras-selected": [selectedExtras: AssociationItemProduct[]];
}>();
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
