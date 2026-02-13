<script setup lang="ts">
import type { Schemas } from "#shopware";

definePageMeta({
  layout: "listing2",
});
const { clearBreadcrumbs } = useBreadcrumbs();
const { resolvePath } = useNavigationSearch();
const route = useRoute();
const routePath = route.path;

const { data: seoResult, error } = await useAsyncData(
  `cmsResponse${routePath}`,
  async () => {
    // For client links if the history state contains seo url information we can omit the api call
    if (import.meta.client) {
      if (history.state?.routeName) {
        return {
          routeName: history.state?.routeName,
          foreignKey: history.state?.foreignKey,
        };
      }
    }
    const seoUrl = await resolvePath(routePath);

    if (!seoUrl?.foreignKey) {
      throw createError({
        statusCode: 404,
        statusMessage: `No data fetched from API for ${routePath}`,
      });
    }

    return seoUrl;
  },
);

if (error.value) {
  throw error.value;
}

const { foreignKey } = useNavigationContext(
  seoResult as Ref<Schemas["SeoUrl"]>,
);

onBeforeRouteLeave(() => {
  clearBreadcrumbs();
});
</script>

<template>
  <CategoryListing v-if="foreignKey" :id="foreignKey" :key="foreignKey" />
</template>
