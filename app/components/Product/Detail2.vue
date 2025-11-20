<script setup lang="ts">
import type { operations, Schemas } from "#shopware";
import type { AssociationItemProduct } from "~/types/Association";

const props = defineProps<{
  productId: string;
}>();

const { apiClient } = useShopwareContext();

const productId = toRef(props.productId);

const searchCriteria = {
  includes: {
    product: [
      "id",
      "productNumber",
      "name",
      "description",
      "calculatedPrice",
      "translated",
      "properties",
      "propertyIds",
      "options",
      "optionIds",
      "configuratorSettings",
      "children",
      "parentId",
      "sortedProperties",
      "cover",
    ],
    property: ["id", "name", "translated", "options"],
    property_group_option: ["id", "name", "translated", "group"],
    product_configurator_setting: ["id", "optionId", "option", "productId"],
    product_option: ["id", "groupId", "name", "translated", "group"],
  },
  associations: {
    cover: {
      associations: {
        media: {},
      },
    },
    properties: {
      associations: {
        group: {},
      },
    },
    options: {
      associations: {
        group: {},
      },
    },
    configuratorSettings: {
      associations: {
        option: {
          associations: {
            group: {},
          },
        },
      },
    },
    children: {
      associations: {
        properties: {
          associations: {
            group: {},
          },
        },
        options: {
          associations: {
            group: {},
          },
        },
      },
    },
  },
} as operations["searchPage post /search"]["body"];

const { data: productDetails, pending } = useAsyncData(
  () => `product-${productId.value ?? "none"}`,
  async () => {
    if (!productId.value) return null;
    const response = await apiClient.invoke(
      "readProductDetail post /product/{productId}",
      {
        pathParams: { productId: productId.value },
        body: searchCriteria,
      },
    );
    return response.data;
  },
);

const {
  selectedProduct,
  selectedQuantity,
  addToCart,
  setSelectedProduct,
  setSelectedExtras,
  setDeselectedIngredients,
} = useAddToCart();

// Initialize when productDetails is loaded
watch(
  () => productDetails.value?.product,
  (product) => {
    if (product) {
      setSelectedProduct(product);
    }
  },
  { immediate: true },
);

const onVariantSwitched = (variant: Schemas["Product"]) => {
  setSelectedProduct(variant);
};

const onExtrasSelected = (extras: AssociationItemProduct[]) => {
  setSelectedExtras(extras);
};

const onIngredientsDeselected = (deselected: string[]) => {
  setDeselectedIngredients(deselected);
};

const onAddToCart = () => emit("product-added");

const emit = defineEmits(["product-added"]);
</script>

<template>
  <div v-if="!pending">
    <div v-if="productDetails?.configurator">
      <ProductConfigurator2
        v-if="productDetails?.configurator"
        :p="productDetails.product"
        :c="productDetails.configurator"
        @variant-switched="onVariantSwitched"
      />
      <ProductCrossSelling
        v-if="selectedProduct"
        :product="selectedProduct"
        @extras-selected="onExtrasSelected"
      />
      <ProductDeselectIngredient
        v-if="selectedProduct"
        :product="selectedProduct"
        @ingredients-deselected="onIngredientsDeselected"
      />
    </div>
    <div class="flex flex-row gap-4 mt-8">
      <UInputNumber
        v-model="selectedQuantity"
        size="xl"
        placeholder="Anzahl"
        :min="1"
        :max="100"
      />
      <UButton
        size="xl"
        label="In den Warenkorb"
        icon="i-lucide-shopping-cart"
        block
        @click="addToCart(onAddToCart)"
      />
    </div>
  </div>
</template>
