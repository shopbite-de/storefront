<script setup lang="ts">
import type { Breadcrumb } from "~/types/commerce/category";
import type { BreadcrumbItem } from "#ui/components/Breadcrumb.vue";

const props = defineProps<{
  categoryId: string | undefined;
}>();

const { categoryId } = toRefs(props);

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
  return await $fetch(`/api/breadcrumb/${categoryId.value}`);
});

const items = computed<BreadcrumbItem[]>(() => {
  if (!data.value) return [{ label: "Kategorie", to: "#" }];
  return data.value?.map((item: Breadcrumb) => {
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
