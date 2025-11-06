<script setup lang="ts">
import type { Schemas } from "#shopware";
import ProductCard from "~/components/Product/Card.vue";

const props = defineProps({
  category: {
    type: Object as () => Schemas["Category"],
    required: true,
  },
});

const category = toRef(props.category);
const { apiClient } = useShopwareContext();
const categoryProducts = ref<Schemas["Product"][]>([]);
const isLoading = ref(true);

const fetchCategoryProducts = async () => {
  isLoading.value = true;
  try {
    const { data } = await apiClient.invoke("readProduct post /product", {
      body: {
        filter: [
          {
            type: "equals",
            field: "categoryTree",
            value: category.value.id,
          },
          {
            type: "equals",
            field: "parentId",
            value: null,
          },
        ],
        includes: {
          product: [
            "id",
            "productNumber",
            "name",
            "description",
            "calculatedPrice",
            "translated",
            "categories",
            "properties",
            "propertyIds",
            "options",
            "optionIds",
            "configuratorSettings",
            "children",
            "parentId",
            "sortedProperties",
          ],
          property: ["id", "name", "translated", "options"],
          property_group_option: ["id", "name", "translated", "group"],
          product_configurator_setting: [
            "id",
            "optionId",
            "option",
            "productId",
          ],
          product_option: ["id", "groupId", "name", "translated", "group"],
        },
        sort: [
          {
            field: "productNumber",
            order: "asc",
          },
        ],
        associations: {
          categories: {},
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
      },
    });

    if (data?.elements) {
      categoryProducts.value = data.elements;
    }
  } catch (error) {
    console.error(`[category-products][${category.value.id}]`, error);
  } finally {
    isLoading.value = false;
  }
};

// Fetch products when the component is mounted
onMounted(() => {
  fetchCategoryProducts();
});
</script>
<template>
  <div
    v-if="!isLoading && categoryProducts.length > 0"
    :id="category.name ?? ''"
    class="flex flex-col"
  >
    <div class="mb-4 mt-8">
      <h3 class="text-4xl">{{ category.name }}</h3>
      <h4 v-if="category.description" class="text-gray-500">
        {{ category.description }}
      </h4>
    </div>
    <div v-if="category.childCount > 0" class="grid grid-cols-1 gap-4">
      <ProductCategory
        v-for="child in category.children"
        :key="child.id"
        :category="child"
      />
    </div>
    <div v-else class="grid grid-cols-1 gap-4">
      <ProductCard
        v-for="product in categoryProducts"
        :key="product.id"
        :product="product"
        :with-favorite-button="true"
        :with-add-to-cart-button="true"
      />
    </div>
  </div>
  <div v-else-if="isLoading" class="flex flex-col">
    <div class="mb-4 mt-8">
      <h3 class="text-4xl">{{ category.name }}</h3>
      <div class="animate-pulse h-6 w-24 bg-gray-200 rounded" />
    </div>
  </div>
</template>
