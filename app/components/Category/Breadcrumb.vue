<script setup lang="ts">
import type { Schemas } from "#shopware";
import type { BreadcrumbItem } from "#ui/components/Breadcrumb.vue";

const props = defineProps<{
  categoryId: string | undefined;
}>();

const { categoryId } = toRefs(props);

const { apiClient } = useShopwareContext();

const breadcrumbJsonLd = ref<object | null>(null);

useHead(() => {
  if (!breadcrumbJsonLd.value) return {};
  return {
    script: [
      {
        key: "jsonld-breadcrumb",
        type: "application/ld+json",
        children: JSON.stringify(breadcrumbJsonLd.value),
      },
    ],
  };
});

const cacheKey = computed(() => `breadcrumb-${categoryId.value}`);

const { data } = await useAsyncData(cacheKey, async () => {
  if (!categoryId.value) return [];
  const response = await apiClient.invoke(
    "readBreadcrumb get /breadcrumb/{id}",
    {
      pathParams: { id: categoryId.value },
      query: { type: "category" },
    },
  );
  return response.data;
});

const items = computed<BreadcrumbItem[]>(() => {
  if (!data.value) return [];
  return data.value?.map((item: Schemas["Breadcrumb"]) => {
    return {
      label: item.name,
      to: "/" + item.path,
    };
  });
});

watchEffect(() => {
  const list = items.value ?? [];
  if (!list.length) {
    breadcrumbJsonLd.value = null;
    return;
  }

  breadcrumbJsonLd.value = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: list.map((it, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: it.label,
      item: new URL(String(it.to ?? "/"), useRequestURL().origin).toString(),
    })),
  };
});
</script>

<template>
  <UBreadcrumb :items="items" />
</template>
