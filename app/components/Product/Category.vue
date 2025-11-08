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
            "cover",
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
            order: "ASC",
          },
        ],
        associations: {
          cover: {
            associations: {
              media: {},
            },
          },
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
    <div class="relative mb-4 mt-8 h-40 w-full overflow-hidden rounded-lg">
      <NuxtImg
        v-if="category.media?.url"
        :src="category.media.url"
        class="absolute inset-0 h-full w-full object-cover"
        sizes="sm:100vw md:700px"
        alt="Pizza Kategorie"
        placeholder
      />
      <div
        class="absolute inset-0 bg-gradient-to-t from-black/50 to-black/10"
      />
      <div class="relative z-10 p-4">
        <h2 class="text-3xl md:text-4xl text-white drop-shadow">
          {{ category.name }}
        </h2>
        <h3 v-if="category.description" class="text-white/90">
          {{ category.description }}
        </h3>
      </div>
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
  <div v-else-if="isLoading" class="flex flex-col" />
</template>
