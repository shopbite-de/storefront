<script setup lang="ts">
import type { Schemas } from "#shopware";

// Every path without a file-based page: Markdown content pages first, then
// the category SEO URLs of the backend, whatever their prefix (`/c/Pizza/`,
// `/speisekarte/pizza/`).
const route = useRoute();
// Server route instead of queryCollection(): keeps the SQLite WASM client
// out of client-side navigations (#314).
const { data: page, error } = await useAsyncData(
  `landingpages-${route.path}`,
  () => $fetch("/api/content/page", { query: { path: route.path } }),
);

// A failing content server is a real error and stays fatal (logged); 4xx
// means there is no such page (the route rejects over-long paths with 400).
if ((error.value?.statusCode ?? 0) >= 500) {
  throw createError({
    statusCode: 500,
    statusMessage: "Page could not be loaded",
    fatal: true,
  });
}

let categoryId: Ref<string> | undefined;

if (page.value) {
  usePageSeo({
    title: page.value.title,
    description: page.value.description,
  });
} else {
  // Scanner requests (`/wp-login.php`, `/.env`) are no SEO URLs; answer
  // them without asking the backend.
  if (/\.[a-z0-9]+$/i.test(route.path)) {
    throw createNotFoundError(`Page ${route.path} not found!`);
  }

  const { seoUrl } = await useSeoUrlRoute();
  categoryId = useNavigationContext(
    seoUrl as Ref<Schemas["SeoUrl"]>,
  ).foreignKey;

  const { clearBreadcrumbs } = useBreadcrumbs();
  onBeforeRouteLeave(() => {
    clearBreadcrumbs();
  });
}
</script>

<template>
  <UContainer v-if="page">
    <ContentRenderer :value="page" class="content my-8" />
  </UContainer>
  <div v-else-if="categoryId">
    <!-- the listing layout's category bar, without switching layouts -->
    <div class="sticky top-16 left-0 z-20 w-full backdrop-blur-md rounded-md">
      <NavigationMobileTop />
    </div>
    <CategoryListing :id="categoryId" :key="categoryId" />
  </div>
</template>
