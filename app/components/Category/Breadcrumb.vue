<script setup lang="ts">
import type { BreadcrumbItem } from "../../../shared/domain";

const props = defineProps<{
  categoryId: string | undefined;
}>();

const { categoryId } = toRefs(props);
const { t } = useI18n();

const breadcrumbJsonLd = ref<object | null>(null);

useHead(() => ({
  script: breadcrumbJsonLd.value
    ? [
        {
          key: "jsonld-breadcrumb",
          type: "application/ld+json",
          innerHTML: JSON.stringify(breadcrumbJsonLd.value),
        },
      ]
    : [],
}));

const cacheKey = computed(() => `breadcrumb-${categoryId.value}`);

const { data } = await useAsyncData(cacheKey, async () => {
  if (!categoryId.value) return [];
  // cached on the server (server/api/breadcrumb); 404 = empty breadcrumb
  try {
    return await $fetch<BreadcrumbItem[]>(
      `/api/breadcrumb/${categoryId.value}`,
    );
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) return [];
    throw error;
  }
});

const items = computed<{ label?: string; to: string }[]>(() => {
  if (!data.value) return [{ label: t("menu.breadcrumb.loading"), to: "#" }];
  return data.value.map((item) => ({ label: item.label, to: item.path }));
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
  <nav :aria-label="$t('menu.breadcrumb.label')" class="mb-2 font-body text-sm">
    <ol class="flex flex-wrap items-center gap-1 text-sb-ink-muted">
      <li
        v-for="(item, index) in items"
        :key="item.to"
        class="flex items-center gap-1"
      >
        <SbIcon
          v-if="index > 0"
          name="chevron-right"
          :size="14"
          class="text-sb-ink-muted"
        />
        <NuxtLink
          v-if="index < items.length - 1"
          :to="item.to"
          class="inline-flex min-h-11 items-center font-semibold text-sb-primary-ink underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-sb-focus"
          >{{ item.label }}</NuxtLink
        >
        <span
          v-else
          aria-current="page"
          class="inline-flex min-h-11 items-center font-semibold text-sb-ink"
          >{{ item.label }}</span
        >
      </li>
    </ol>
  </nav>
</template>
