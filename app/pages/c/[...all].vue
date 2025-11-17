<script setup lang="ts">
import type { Schemas } from "#shopware";

definePageMeta({
  layout: "listing2",
});
const { clearBreadcrumbs } = useBreadcrumbs();
const { resolvePath } = useNavigationSearch();
const route = useRoute();
const routePath = route.path;

const { data: seoResult } = await useAsyncData(
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
    return seoUrl;
  },
);

if (!seoResult.value?.foreignKey) {
  console.error("c/[...all].vue:", `No data found in API for ${routePath}`);

  throw createError({
    statusCode: 404,
    statusMessage: `No data fetched from API for ${routePath}`,
  });
}

const { foreignKey } = useNavigationContext(
  seoResult as Ref<Schemas["SeoUrl"]>,
);

onBeforeRouteLeave(() => {
  clearBreadcrumbs();
});
</script>

<template>
  <CategoryListing :id="foreignKey" />
</template>
