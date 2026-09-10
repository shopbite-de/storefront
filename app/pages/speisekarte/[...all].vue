<script setup lang="ts">
import type { Schemas } from "#shopware";

definePageMeta({
  layout: "listing",
});

const { clearBreadcrumbs } = useBreadcrumbs();
const { seoUrl } = await useSeoUrlRoute();

const { foreignKey } = useNavigationContext(seoUrl as Ref<Schemas["SeoUrl"]>);

onBeforeRouteLeave(() => {
  clearBreadcrumbs();
});
</script>

<template>
  <CategoryListing v-if="foreignKey" :id="foreignKey" :key="foreignKey" />
</template>
